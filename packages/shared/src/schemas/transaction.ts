import { z } from "zod";

export const transactionTypes = ["income", "expense", "transfer"] as const;
export type TransactionType = (typeof transactionTypes)[number];

export const createTransactionSchema = z.object({
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format"),
	amount: z.number().int().positive("Amount must be positive (in cents)"),
	type: z.enum(transactionTypes),
	description: z.string().min(1, "Description is required").max(500),
	notes: z.string().max(2000).nullable().optional(),
	categoryId: z.number().int().positive().nullable().optional(),
	accountId: z.number().int().positive(),
	transferToAccountId: z.number().int().positive().nullable().optional(),
	tags: z.array(z.string().min(1).max(50)).optional(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const transactionFilterSchema = z.object({
	search: z.string().optional(),
	type: z.enum(transactionTypes).optional(),
	categoryId: z.number().int().positive().optional(),
	accountId: z.number().int().positive().optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
	amountMin: z.number().int().optional(),
	amountMax: z.number().int().optional(),
	tags: z.array(z.string()).optional(),
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(20),
	sortBy: z.enum(["date", "amount", "description"]).default("date"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionFilter = z.infer<typeof transactionFilterSchema>;
