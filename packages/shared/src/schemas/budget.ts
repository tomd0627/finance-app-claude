import { z } from "zod";

export const createBudgetSchema = z.object({
	categoryId: z.number().int().positive(),
	year: z.number().int().min(2000).max(2100),
	month: z.number().int().min(1).max(12),
	amount: z.number().int().positive("Budget amount must be positive (in cents)"),
	rollover: z.boolean(),
});

export const updateBudgetSchema = createBudgetSchema.partial().required({
	categoryId: true,
	year: true,
	month: true,
});

export const budgetFilterSchema = z.object({
	year: z.number().int(),
	month: z.number().int().min(1).max(12),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
export type BudgetFilter = z.infer<typeof budgetFilterSchema>;
