import { eq } from "drizzle-orm";
import { createCategorySchema, updateCategorySchema } from "shared";
import { z } from "zod";
import { db } from "../../db/index.js";
import { categories } from "../../db/schema.js";
import { publicProcedure, router } from "../index.js";

export const categoryRouter = router({
	list: publicProcedure.query(async () => {
		return await db.select().from(categories);
	}),

	create: publicProcedure.input(createCategorySchema).mutation(async ({ input }) => {
		const [result] = await db.insert(categories).values(input).returning();
		return result;
	}),

	update: publicProcedure
		.input(z.object({ id: z.number(), data: updateCategorySchema }))
		.mutation(async ({ input }) => {
			const [result] = await db
				.update(categories)
				.set(input.data)
				.where(eq(categories.id, input.id))
				.returning();
			if (!result) throw new Error("Category not found");
			return result;
		}),

	delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
		await db.delete(categories).where(eq(categories.id, input.id));
		return { success: true };
	}),
});
