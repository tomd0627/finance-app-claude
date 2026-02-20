import { eq } from "drizzle-orm";
import { createRecurringSchema, updateRecurringSchema } from "shared";
import { z } from "zod";
import { db } from "../../db/index.js";
import { accounts, categories, recurringTransactions } from "../../db/schema.js";
import { publicProcedure, router } from "../index.js";

export const recurringRouter = router({
	list: publicProcedure.query(async () => {
		return await db
			.select({
				id: recurringTransactions.id,
				description: recurringTransactions.description,
				amount: recurringTransactions.amount,
				type: recurringTransactions.type,
				categoryId: recurringTransactions.categoryId,
				accountId: recurringTransactions.accountId,
				frequency: recurringTransactions.frequency,
				startDate: recurringTransactions.startDate,
				endDate: recurringTransactions.endDate,
				isActive: recurringTransactions.isActive,
				lastGenerated: recurringTransactions.lastGenerated,
				createdAt: recurringTransactions.createdAt,
				categoryName: categories.name,
				accountName: accounts.name,
			})
			.from(recurringTransactions)
			.leftJoin(categories, eq(recurringTransactions.categoryId, categories.id))
			.leftJoin(accounts, eq(recurringTransactions.accountId, accounts.id))
			.orderBy(recurringTransactions.createdAt);
	}),

	create: publicProcedure.input(createRecurringSchema).mutation(async ({ input }) => {
		const [result] = await db.insert(recurringTransactions).values(input).returning();
		return result;
	}),

	update: publicProcedure
		.input(z.object({ id: z.number(), data: updateRecurringSchema }))
		.mutation(async ({ input }) => {
			const [result] = await db
				.update(recurringTransactions)
				.set(input.data)
				.where(eq(recurringTransactions.id, input.id))
				.returning();
			if (!result) throw new Error("Recurring transaction not found");
			return result;
		}),

	delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
		await db.delete(recurringTransactions).where(eq(recurringTransactions.id, input.id));
		return { success: true };
	}),

	toggle: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
		const [existing] = await db
			.select({ isActive: recurringTransactions.isActive })
			.from(recurringTransactions)
			.where(eq(recurringTransactions.id, input.id));
		if (!existing) throw new Error("Recurring transaction not found");
		const [result] = await db
			.update(recurringTransactions)
			.set({ isActive: !existing.isActive })
			.where(eq(recurringTransactions.id, input.id))
			.returning();
		return result;
	}),
});
