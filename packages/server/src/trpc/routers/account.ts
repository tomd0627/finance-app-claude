import { eq, sql } from "drizzle-orm";
import { createAccountSchema, updateAccountSchema } from "shared";
import { z } from "zod";
import { db } from "../../db/index.js";
import { accounts, transactions } from "../../db/schema.js";
import { publicProcedure, router } from "../index.js";

export const accountRouter = router({
	list: publicProcedure.query(async () => {
		return await db.select().from(accounts);
	}),

	listWithBalances: publicProcedure.query(async () => {
		const accts = await db.select().from(accounts);

		const results = [];
		for (const account of accts) {
			const [result] = await db
				.select({
					balance: sql<number>`
						coalesce(sum(
							case
								when ${transactions.type} = 'income' then ${transactions.amount}
								when ${transactions.type} = 'expense' then -${transactions.amount}
								when ${transactions.type} = 'transfer' and ${transactions.accountId} = ${account.id} then -${transactions.amount}
								else 0
							end
						), 0)
					`,
				})
				.from(transactions)
				.where(
					sql`${transactions.accountId} = ${account.id} or ${transactions.transferToAccountId} = ${account.id}`,
				);

			results.push({ ...account, balance: result.balance });
		}

		return results;
	}),

	create: publicProcedure.input(createAccountSchema).mutation(async ({ input }) => {
		const [result] = await db.insert(accounts).values(input).returning();
		return result;
	}),

	update: publicProcedure
		.input(z.object({ id: z.number(), data: updateAccountSchema }))
		.mutation(async ({ input }) => {
			const [result] = await db
				.update(accounts)
				.set(input.data)
				.where(eq(accounts.id, input.id))
				.returning();
			if (!result) throw new Error("Account not found");
			return result;
		}),

	delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
		await db.delete(accounts).where(eq(accounts.id, input.id));
		return { success: true };
	}),
});
