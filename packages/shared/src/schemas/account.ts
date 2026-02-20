import { z } from "zod";

export const accountTypes = ["checking", "savings", "credit_card", "cash"] as const;
export type AccountType = (typeof accountTypes)[number];

export const createAccountSchema = z.object({
	name: z.string().min(1, "Name is required").max(100),
	type: z.enum(accountTypes),
});

export const updateAccountSchema = createAccountSchema.partial();

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
