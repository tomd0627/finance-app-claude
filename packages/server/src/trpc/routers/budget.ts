import { and, eq, gte, lte, sql } from "drizzle-orm";
import { createBudgetSchema, updateBudgetSchema } from "shared";
import { z } from "zod";
import { db } from "../../db/index.js";
import { budgets, categories, transactions } from "../../db/schema.js";
import { publicProcedure, router } from "../index.js";

export const budgetRouter = router({
	// Returns all budgets for a month, each with actual spending calculated
	listWithSpending: publicProcedure
		.input(z.object({ year: z.number(), month: z.number() }))
		.query(async ({ input }) => {
			const { year, month } = input;
			const dateFrom = `${year}-${String(month).padStart(2, "0")}-01`;
			const lastDay = new Date(year, month, 0).getDate();
			const dateTo = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

			const rows = await db
				.select({
					id: budgets.id,
					categoryId: budgets.categoryId,
					year: budgets.year,
					month: budgets.month,
					amount: budgets.amount,
					rollover: budgets.rollover,
					categoryName: categories.name,
					categoryColor: categories.color,
					categoryGroup: categories.groupName,
					spent: sql<number>`coalesce((
						select sum(t.amount)
						from transactions t
						where t.category_id = ${budgets.categoryId}
						  and t.type = 'expense'
						  and t.date >= ${dateFrom}
						  and t.date <= ${dateTo}
					), 0)`,
				})
				.from(budgets)
				.leftJoin(categories, eq(budgets.categoryId, categories.id))
				.where(and(eq(budgets.year, year), eq(budgets.month, month)))
				.orderBy(categories.groupName, categories.name);

			return rows.map((row) => ({
				...row,
				remaining: row.amount - row.spent,
				percentage: row.amount > 0 ? Math.min(100, Math.round((row.spent / row.amount) * 100)) : 0,
			}));
		}),

	// Upsert: create or update budget for a category+month combo
	upsert: publicProcedure.input(createBudgetSchema).mutation(async ({ input }) => {
		const { categoryId, year, month, amount, rollover } = input;

		const [existing] = await db
			.select({ id: budgets.id })
			.from(budgets)
			.where(
				and(eq(budgets.categoryId, categoryId), eq(budgets.year, year), eq(budgets.month, month)),
			);

		if (existing) {
			const [result] = await db
				.update(budgets)
				.set({ amount, rollover })
				.where(eq(budgets.id, existing.id))
				.returning();
			return result;
		}

		const [result] = await db.insert(budgets).values(input).returning();
		return result;
	}),

	update: publicProcedure
		.input(z.object({ id: z.number(), data: updateBudgetSchema }))
		.mutation(async ({ input }) => {
			const [result] = await db
				.update(budgets)
				.set(input.data)
				.where(eq(budgets.id, input.id))
				.returning();
			if (!result) throw new Error("Budget not found");
			return result;
		}),

	delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
		await db.delete(budgets).where(eq(budgets.id, input.id));
		return { success: true };
	}),
});
