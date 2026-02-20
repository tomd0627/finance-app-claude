import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { createTransactionSchema } from "shared";
import { z } from "zod";
import { trpc } from "../../lib/trpc";
import { Autocomplete } from "../ui/autocomplete";
import { Modal } from "../ui/modal";

const formSchema = createTransactionSchema
	.extend({
		amountDollars: z.string().min(1, "Amount is required"),
	})
	.omit({ amount: true });

type FormValues = z.infer<typeof formSchema>;

interface TransactionFormProps {
	open: boolean;
	onClose: () => void;
	editingId?: number | null;
}

export function TransactionForm({ open, onClose, editingId }: TransactionFormProps) {
	const utils = trpc.useUtils();
	const categories = trpc.category.list.useQuery();
	const accounts = trpc.account.list.useQuery();
	const suggestions = trpc.transaction.descriptionSuggestions.useQuery();
	const existing = trpc.transaction.getById.useQuery(
		{ id: editingId ?? 0 },
		{ enabled: !!editingId },
	);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		values:
			editingId && existing.data
				? {
						date: existing.data.date,
						amountDollars: (existing.data.amount / 100).toFixed(2),
						type: existing.data.type,
						description: existing.data.description,
						notes: existing.data.notes ?? "",
						categoryId: existing.data.categoryId ?? null,
						accountId: existing.data.accountId,
						transferToAccountId: existing.data.transferToAccountId ?? null,
						tags: existing.data.tags ?? [],
					}
				: undefined,
		defaultValues: {
			date: new Date().toISOString().slice(0, 10),
			amountDollars: "",
			type: "expense",
			description: "",
			notes: "",
			categoryId: null,
			accountId: undefined,
			transferToAccountId: null,
			tags: [],
		},
	});

	const createMutation = trpc.transaction.create.useMutation({
		onSuccess: () => {
			utils.transaction.list.invalidate();
			utils.dashboard.invalidate();
			onClose();
			form.reset();
		},
	});

	const updateMutation = trpc.transaction.update.useMutation({
		onSuccess: () => {
			utils.transaction.list.invalidate();
			utils.transaction.getById.invalidate();
			utils.dashboard.invalidate();
			onClose();
			form.reset();
		},
	});

	const watchType = form.watch("type");
	const isPending = createMutation.isPending || updateMutation.isPending;

	const onSubmit = (values: FormValues) => {
		const dollars = Number.parseFloat(values.amountDollars);
		if (Number.isNaN(dollars) || dollars <= 0) {
			form.setError("amountDollars", { message: "Must be a positive number" });
			return;
		}
		const amount = Math.round(dollars * 100);

		const { amountDollars, ...rest } = values;
		const data = {
			...rest,
			amount,
			notes: rest.notes || null,
			categoryId: rest.categoryId || null,
			transferToAccountId: rest.type === "transfer" ? rest.transferToAccountId : null,
		};

		if (editingId) {
			updateMutation.mutate({ id: editingId, data });
		} else {
			createMutation.mutate(data);
		}
	};

	return (
		<Modal open={open} onClose={onClose} title={editingId ? "Edit Transaction" : "Add Transaction"}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<label htmlFor="tx-date" className="mb-1 block text-sm font-medium">
							Date
						</label>
						<input
							id="tx-date"
							type="date"
							{...form.register("date")}
							className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
						/>
						{form.formState.errors.date && (
							<p className="mt-1 text-xs text-destructive">{form.formState.errors.date.message}</p>
						)}
					</div>

					<div>
						<label htmlFor="tx-amount" className="mb-1 block text-sm font-medium">
							Amount ($)
						</label>
						<input
							id="tx-amount"
							type="text"
							inputMode="decimal"
							placeholder="0.00"
							{...form.register("amountDollars", {
								onBlur: (e) => {
									const val = Number.parseFloat(e.target.value);
									if (!Number.isNaN(val) && val > 0) form.setValue("amountDollars", val.toFixed(2));
								},
							})}
							className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
						/>
						{form.formState.errors.amountDollars && (
							<p className="mt-1 text-xs text-destructive">
								{form.formState.errors.amountDollars.message}
							</p>
						)}
					</div>
				</div>

				<fieldset className="border-0 p-0">
					<legend className="mb-1 text-sm font-medium">Type</legend>
					<div className="flex gap-2">
						{(["expense", "income", "transfer"] as const).map((t) => (
							<button
								key={t}
								type="button"
								aria-pressed={watchType === t}
								onClick={() => form.setValue("type", t)}
								className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium capitalize transition-colors ${
									watchType === t
										? t === "income"
											? "border-green-500 bg-green-50 text-green-700"
											: t === "expense"
												? "border-red-500 bg-red-50 text-red-700"
												: "border-blue-500 bg-blue-50 text-blue-700"
										: "hover:bg-accent"
								}`}
							>
								{t}
							</button>
						))}
					</div>
				</fieldset>

				<div>
					<label htmlFor="tx-desc" className="mb-1 block text-sm font-medium">
						Description
					</label>
					<Controller
						control={form.control}
						name="description"
						render={({ field }) => (
							<Autocomplete
								id="tx-desc"
								value={field.value}
								onChange={field.onChange}
								onBlur={field.onBlur}
								name={field.name}
								suggestions={suggestions.data ?? []}
								placeholder="e.g., Grocery shopping"
								className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
							/>
						)}
					/>
					{form.formState.errors.description && (
						<p className="mt-1 text-xs text-destructive">
							{form.formState.errors.description.message}
						</p>
					)}
				</div>

				<div>
					<label htmlFor="tx-account" className="mb-1 block text-sm font-medium">
						Account
					</label>
					<select
						id="tx-account"
						{...form.register("accountId", { valueAsNumber: true })}
						className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
					>
						<option value="">Select account...</option>
						{accounts.data?.map((a) => (
							<option key={a.id} value={a.id}>
								{a.name}
							</option>
						))}
					</select>
					{form.formState.errors.accountId && (
						<p className="mt-1 text-xs text-destructive">
							{form.formState.errors.accountId.message}
						</p>
					)}
				</div>

				{watchType === "transfer" && (
					<div>
						<label htmlFor="tx-transfer-to" className="mb-1 block text-sm font-medium">
							Transfer To
						</label>
						<select
							id="tx-transfer-to"
							{...form.register("transferToAccountId", { valueAsNumber: true })}
							className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="">Select account...</option>
							{accounts.data?.map((a) => (
								<option key={a.id} value={a.id}>
									{a.name}
								</option>
							))}
						</select>
					</div>
				)}

				{watchType !== "transfer" && (
					<div>
						<label htmlFor="tx-category" className="mb-1 block text-sm font-medium">
							Category
						</label>
						<select
							id="tx-category"
							{...form.register("categoryId", { valueAsNumber: true })}
							className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="">No category</option>
							{categories.data
								?.filter((c) => c.type === "both" || c.type === watchType)
								.map((c) => (
									<option key={c.id} value={c.id}>
										{c.name}
									</option>
								))}
						</select>
					</div>
				)}

				<div>
					<label htmlFor="tx-notes" className="mb-1 block text-sm font-medium">
						Notes
					</label>
					<textarea
						id="tx-notes"
						{...form.register("notes")}
						rows={2}
						placeholder="Optional notes..."
						className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
					/>
				</div>

				{(createMutation.error || updateMutation.error) && (
					<p className="text-sm text-destructive">
						{createMutation.error?.message || updateMutation.error?.message}
					</p>
				)}

				<div className="flex justify-end gap-2 pt-2">
					<button
						type="button"
						onClick={onClose}
						className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isPending}
						className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
					>
						{isPending ? "Saving..." : editingId ? "Update" : "Add Transaction"}
					</button>
				</div>
			</form>
		</Modal>
	);
}
