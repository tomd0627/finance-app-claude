import { and, asc, count, desc, eq, gte, like, lte, sql } from "drizzle-orm";
import { createTransactionSchema, transactionFilterSchema, updateTransactionSchema } from "shared";
import { z } from "zod";
import { db } from "../../db/index.js";
import { accounts, categories, tags, transactionTags, transactions } from "../../db/schema.js";
import { publicProcedure, router } from "../index.js";

export const transactionRouter = router({
	list: publicProcedure.input(transactionFilterSchema).query(async ({ input }) => {
		const conditions = [];

		if (input.type) conditions.push(eq(transactions.type, input.type));
		if (input.categoryId) conditions.push(eq(transactions.categoryId, input.categoryId));
		if (input.accountId) conditions.push(eq(transactions.accountId, input.accountId));
		if (input.dateFrom) conditions.push(gte(transactions.date, input.dateFrom));
		if (input.dateTo) conditions.push(lte(transactions.date, input.dateTo));
		if (input.amountMin) conditions.push(gte(transactions.amount, input.amountMin));
		if (input.amountMax) conditions.push(lte(transactions.amount, input.amountMax));
		if (input.search) conditions.push(like(transactions.description, `%${input.search}%`));

		const where = conditions.length > 0 ? and(...conditions) : undefined;
		const orderColumn =
			input.sortBy === "amount"
				? transactions.amount
				: input.sortBy === "description"
					? transactions.description
					: transactions.date;
		const orderFn = input.sortOrder === "asc" ? asc : desc;

		const offset = (input.page - 1) * input.pageSize;

		const items = await db
			.select({
				id: transactions.id,
				date: transactions.date,
				amount: transactions.amount,
				type: transactions.type,
				description: transactions.description,
				notes: transactions.notes,
				categoryId: transactions.categoryId,
				accountId: transactions.accountId,
				transferToAccountId: transactions.transferToAccountId,
				createdAt: transactions.createdAt,
				updatedAt: transactions.updatedAt,
				categoryName: categories.name,
				categoryColor: categories.color,
				accountName: accounts.name,
			})
			.from(transactions)
			.leftJoin(categories, eq(transactions.categoryId, categories.id))
			.leftJoin(accounts, eq(transactions.accountId, accounts.id))
			.where(where)
			.orderBy(orderFn(orderColumn))
			.limit(input.pageSize)
			.offset(offset);

		const [{ total }] = await db.select({ total: count() }).from(transactions).where(where);

		return {
			items,
			total,
			page: input.page,
			pageSize: input.pageSize,
			totalPages: Math.ceil(total / input.pageSize),
		};
	}),

	getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
		const [transaction] = await db.select().from(transactions).where(eq(transactions.id, input.id));

		if (!transaction) throw new Error("Transaction not found");

		const txTags = await db
			.select({ name: tags.name })
			.from(transactionTags)
			.innerJoin(tags, eq(transactionTags.tagId, tags.id))
			.where(eq(transactionTags.transactionId, input.id));

		return { ...transaction, tags: txTags.map((t) => t.name) };
	}),

	create: publicProcedure.input(createTransactionSchema).mutation(async ({ input }) => {
		const { tags: tagNames, ...data } = input;

		const [result] = await db.insert(transactions).values(data).returning();

		if (tagNames && tagNames.length > 0) {
			for (const name of tagNames) {
				await db.insert(tags).values({ name }).onConflictDoNothing();
				const [tag] = await db.select().from(tags).where(eq(tags.name, name));
				if (tag) {
					await db.insert(transactionTags).values({ transactionId: result.id, tagId: tag.id });
				}
			}
		}

		return result;
	}),

	update: publicProcedure
		.input(z.object({ id: z.number(), data: updateTransactionSchema }))
		.mutation(async ({ input }) => {
			const { tags: tagNames, ...data } = input.data;

			const [result] = await db
				.update(transactions)
				.set({ ...data, updatedAt: sql`datetime('now')` })
				.where(eq(transactions.id, input.id))
				.returning();

			if (!result) throw new Error("Transaction not found");

			if (tagNames !== undefined) {
				await db.delete(transactionTags).where(eq(transactionTags.transactionId, input.id));

				if (tagNames.length > 0) {
					for (const name of tagNames) {
						await db.insert(tags).values({ name }).onConflictDoNothing();
						const [tag] = await db.select().from(tags).where(eq(tags.name, name));
						if (tag) {
							await db.insert(transactionTags).values({ transactionId: input.id, tagId: tag.id });
						}
					}
				}
			}

			return result;
		}),

	delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
		await db.delete(transactions).where(eq(transactions.id, input.id));
		return { success: true };
	}),

	importBulk: publicProcedure
		.input(
			z.array(
				createTransactionSchema.omit({ tags: true }).extend({
					tags: z.array(z.string()).optional(),
				}),
			),
		)
		.mutation(async ({ input }) => {
			let imported = 0;
			for (const row of input) {
				const { tags: tagNames, ...data } = row;
				const [result] = await db.insert(transactions).values(data).returning();
				if (tagNames && tagNames.length > 0) {
					for (const name of tagNames) {
						await db.insert(tags).values({ name }).onConflictDoNothing();
						const [tag] = await db.select().from(tags).where(eq(tags.name, name));
						if (tag) {
							await db.insert(transactionTags).values({ transactionId: result.id, tagId: tag.id });
						}
					}
				}
				imported++;
			}
			return { imported };
		}),

	summary: publicProcedure
		.input(z.object({ dateFrom: z.string(), dateTo: z.string() }))
		.query(async ({ input }) => {
			return await db
				.select({
					type: transactions.type,
					categoryId: transactions.categoryId,
					total: sql<number>`sum(${transactions.amount})`,
					count: count(),
				})
				.from(transactions)
				.where(and(gte(transactions.date, input.dateFrom), lte(transactions.date, input.dateTo)))
				.groupBy(transactions.type, transactions.categoryId);
		}),

	descriptionSuggestions: publicProcedure.query(async () => {
		const rows = await db
			.select({
				description: transactions.description,
				frequency: count().as("frequency"),
			})
			.from(transactions)
			.groupBy(transactions.description)
			.orderBy(desc(count()))
			.limit(50);
		return rows.map((r) => r.description);
	}),
});
