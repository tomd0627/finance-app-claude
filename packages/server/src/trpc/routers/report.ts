import { and, count, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.js";
import { accounts, categories, transactions } from "../../db/schema.js";
import { publicProcedure, router } from "../index.js";

const dateRangeInput = z.object({ dateFrom: z.string(), dateTo: z.string() });

export const reportRouter = router({
	// Overall income / expenses / net for a date range
	summary: publicProcedure.input(dateRangeInput).query(async ({ input }) => {
		const totals = await db
			.select({
				type: transactions.type,
				total: sql<number>`sum(${transactions.amount})`,
				count: count(),
			})
			.from(transactions)
			.where(and(gte(transactions.date, input.dateFrom), lte(transactions.date, input.dateTo)))
			.groupBy(transactions.type);

		const income = totals.find((t) => t.type === "income")?.total ?? 0;
		const expenses = totals.find((t) => t.type === "expense")?.total ?? 0;
		const txCount = totals.reduce((sum, t) => sum + t.count, 0);

		return { income, expenses, net: income - expenses, txCount };
	}),

	// Expense breakdown by category for a date range, sorted descending by amount
	spendingByCategory: publicProcedure.input(dateRangeInput).query(async ({ input }) => {
		return await db
			.select({
				categoryId: transactions.categoryId,
				categoryName: categories.name,
				color: categories.color,
				total: sql<number>`sum(${transactions.amount})`,
				count: count(),
			})
			.from(transactions)
			.leftJoin(categories, eq(transactions.categoryId, categories.id))
			.where(
				and(
					eq(transactions.type, "expense"),
					gte(transactions.date, input.dateFrom),
					lte(transactions.date, input.dateTo),
				),
			)
			.groupBy(transactions.categoryId)
			.orderBy(sql`sum(${transactions.amount}) desc`);
	}),

	// Per-month income/expenses/net breakdown for a date range
	monthlyBreakdown: publicProcedure.input(dateRangeInput).query(async ({ input }) => {
		const rows = await db
			.select({
				monthKey: sql<string>`strftime('%Y-%m', ${transactions.date})`,
				type: transactions.type,
				total: sql<number>`sum(${transactions.amount})`,
			})
			.from(transactions)
			.where(
				and(
					gte(transactions.date, input.dateFrom),
					lte(transactions.date, input.dateTo),
					inArray(transactions.type, ["income", "expense"]),
				),
			)
			.groupBy(sql`strftime('%Y-%m', ${transactions.date})`, transactions.type)
			.orderBy(sql`strftime('%Y-%m', ${transactions.date})`);

		const months = [...new Set(rows.map((r) => r.monthKey))].sort();

		return months.map((key) => {
			const [y, m] = key.split("-").map(Number);
			const label = new Date(y, m - 1).toLocaleDateString("en-US", {
				month: "short",
				year: "numeric",
			});
			const income = rows.find((r) => r.monthKey === key && r.type === "income")?.total ?? 0;
			const expenses = rows.find((r) => r.monthKey === key && r.type === "expense")?.total ?? 0;
			return { key, label, income, expenses, net: income - expenses };
		});
	}),

	// All transactions in a date range for CSV export (no pagination)
	exportTransactions: publicProcedure.input(dateRangeInput).query(async ({ input }) => {
		return await db
			.select({
				date: transactions.date,
				description: transactions.description,
				amount: transactions.amount,
				type: transactions.type,
				notes: transactions.notes,
				categoryName: categories.name,
				accountName: accounts.name,
			})
			.from(transactions)
			.leftJoin(categories, eq(transactions.categoryId, categories.id))
			.leftJoin(accounts, eq(transactions.accountId, accounts.id))
			.where(and(gte(transactions.date, input.dateFrom), lte(transactions.date, input.dateTo)))
			.orderBy(sql`${transactions.date} desc, ${transactions.id} desc`);
	}),
});
