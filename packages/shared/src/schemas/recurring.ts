import { z } from "zod";

export const frequencies = ["daily", "weekly", "biweekly", "monthly", "yearly"] as const;
export type Frequency = (typeof frequencies)[number];

export const createRecurringSchema = z.object({
	description: z.string().min(1).max(500),
	amount: z.number().int().positive(),
	type: z.enum(["income", "expense"]),
	categoryId: z.number().int().positive().nullable().optional(),
	accountId: z.number().int().positive(),
	frequency: z.enum(frequencies),
	startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	endDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.nullable()
		.optional(),
});

export const updateRecurringSchema = createRecurringSchema.partial();

export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;
export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;
