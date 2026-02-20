import { and, count, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.js";
import { categories, transactions } from "../../db/schema.js";
import { publicProcedure, router } from "../index.js";

export const dashboardRouter = router({
	monthlySummary: publicProcedure
		.input(z.object({ year: z.number(), month: z.number() }))
		.query(async ({ input }) => {
			const dateFrom = `${input.year}-${String(input.month).padStart(2, "0")}-01`;
			const lastDay = new Date(input.year, input.month, 0).getDate();
			const dateTo = `${input.year}-${String(input.month).padStart(2, "0")}-${lastDay}`;

			const totals = await db
				.select({
					type: transactions.type,
					total: sql<number>`sum(${transactions.amount})`,
					count: count(),
				})
				.from(transactions)
				.where(and(gte(transactions.date, dateFrom), lte(transactions.date, dateTo)))
				.groupBy(transactions.type);

			const income = totals.find((t) => t.type === "income")?.total ?? 0;
			const expenses = totals.find((t) => t.type === "expense")?.total ?? 0;

			return { income, expenses, net: income - expenses };
		}),

	spendingByCategory: publicProcedure
		.input(z.object({ dateFrom: z.string(), dateTo: z.string() }))
		.query(async ({ input }) => {
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
				.groupBy(transactions.categoryId);
		}),

	recentTransactions: publicProcedure
		.input(z.object({ limit: z.number().default(10) }))
		.query(async ({ input }) => {
			return await db
				.select()
				.from(transactions)
				.orderBy(sql`${transactions.date} desc, ${transactions.id} desc`)
				.limit(input.limit);
		}),

	monthlyTrend: publicProcedure.query(async () => {
		// Build last 6 months metadata
		const now = new Date();
		const months = Array.from({ length: 6 }, (_, i) => {
			const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
			const year = d.getFullYear();
			const month = d.getMonth() + 1;
			return {
				key: `${year}-${String(month).padStart(2, "0")}`,
				label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
			};
		});

		const dateFrom = `${months[0].key}-01`;
		const lastMonth = months[months.length - 1];
		const lastDay = new Date(
			Number(lastMonth.key.slice(0, 4)),
			Number(lastMonth.key.slice(5, 7)),
			0,
		).getDate();
		const dateTo = `${lastMonth.key}-${lastDay}`;

		const rows = await db
			.select({
				monthKey: sql<string>`strftime('%Y-%m', ${transactions.date})`,
				type: transactions.type,
				total: sql<number>`sum(${transactions.amount})`,
			})
			.from(transactions)
			.where(
				and(
					gte(transactions.date, dateFrom),
					lte(transactions.date, dateTo),
					inArray(transactions.type, ["income", "expense"]),
				),
			)
			.groupBy(sql`strftime('%Y-%m', ${transactions.date})`, transactions.type);

		return months.map(({ key, label }) => ({
			month: label,
			income: rows.find((r) => r.monthKey === key && r.type === "income")?.total ?? 0,
			expenses: rows.find((r) => r.monthKey === key && r.type === "expense")?.total ?? 0,
		}));
	}),
});
