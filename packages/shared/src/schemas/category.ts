import { z } from "zod";

export const categoryTypes = ["income", "expense", "both"] as const;
export type CategoryType = (typeof categoryTypes)[number];

export const createCategorySchema = z.object({
	name: z.string().min(1, "Name is required").max(100),
	groupName: z.string().max(100).nullable().optional(),
	color: z
		.string()
		.regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color")
		.nullable()
		.optional(),
	icon: z.string().max(50).nullable().optional(),
	type: z.enum(categoryTypes),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
