import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { createRecurringSchema, frequencies } from "shared";
import { z } from "zod";
import { Autocomplete } from "../../components/ui/autocomplete";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { EmptyState } from "../../components/ui/empty-state";
import { Modal } from "../../components/ui/modal";
import { trpc } from "../../lib/trpc";
import { useKeyboardShortcut } from "../../lib/use-keyboard-shortcut";
import { formatCurrency, formatDate } from "../../lib/utils";

const recurringFormSchema = createRecurringSchema.omit({ amount: true }).extend({
	amountDollars: z.string().min(1, "Amount is required"),
});
type RecurringFormValues = z.infer<typeof recurringFormSchema>;

const frequencyLabels: Record<string, string> = {
	daily: "Daily",
	weekly: "Weekly",
	biweekly: "Biweekly",
	monthly: "Monthly",
	yearly: "Yearly",
};

const today = new Date().toISOString().slice(0, 10);

export function Recurring() {
	const [formOpen, setFormOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [deletingId, setDeletingId] = useState<number | null>(null);

	const utils = trpc.useUtils();
	const recurringQuery = trpc.recurring.list.useQuery();
	const accounts = trpc.account.list.useQuery();
	const categories = trpc.category.list.useQuery();
	const suggestions = trpc.transaction.descriptionSuggestions.useQuery();

	const form = useForm<RecurringFormValues>({
		resolver: zodResolver(recurringFormSchema),
		defaultValues: {
			description: "",
			amountDollars: "",
			type: "expense",
			frequency: "monthly",
			accountId: 0,
			categoryId: null,
			startDate: today,
			endDate: null,
		},
	});

	const watchedType = form.watch("type");

	const createMutation = trpc.recurring.create.useMutation({
		onSuccess: () => {
			utils.recurring.invalidate();
			closeForm();
		},
	});

	const updateMutation = trpc.recurring.update.useMutation({
		onSuccess: () => {
			utils.recurring.invalidate();
			closeForm();
		},
	});

	const deleteMutation = trpc.recurring.delete.useMutation({
		onSuccess: () => {
			utils.recurring.invalidate();
			setDeletingId(null);
		},
	});

	const toggleMutation = trpc.recurring.toggle.useMutation({
		onSuccess: () => {
			utils.recurring.invalidate();
		},
	});

	const closeForm = () => {
		setFormOpen(false);
		setEditingId(null);
		form.reset({
			description: "",
			amountDollars: "",
			type: "expense",
			frequency: "monthly",
			accountId: 0,
			categoryId: null,
			startDate: today,
			endDate: null,
		});
	};

	const openCreate = () => {
		form.reset({
			description: "",
			amountDollars: "",
			type: "expense",
			frequency: "monthly",
			accountId: 0,
			categoryId: null,
			startDate: today,
			endDate: null,
		});
		setEditingId(null);
		setFormOpen(true);
	};

	useKeyboardShortcut("n", openCreate);

	const openEdit = (row: {
		id: number;
		description: string;
		amount: number;
		type: "income" | "expense";
		frequency: (typeof frequencies)[number];
		accountId: number;
		categoryId: number | null;
		startDate: string;
		endDate: string | null;
	}) => {
		form.reset({
			description: row.description,
			amountDollars: (row.amount / 100).toFixed(2),
			type: row.type,
			frequency: row.frequency,
			accountId: row.accountId,
			categoryId: row.categoryId ?? null,
			startDate: row.startDate,
			endDate: row.endDate ?? null,
		});
		setEditingId(row.id);
		setFormOpen(true);
	};

	const onSubmit = (values: RecurringFormValues) => {
		const dollars = Number.parseFloat(values.amountDollars);
		if (Number.isNaN(dollars) || dollars <= 0) {
			form.setError("amountDollars", { message: "Must be a positive number" });
			return;
		}
		const data = { ...values, amount: Math.round(dollars * 100) };
		const { amountDollars: _, ...payload } = data;
		if (editingId) {
			updateMutation.mutate({ id: editingId, data: payload });
		} else {
			createMutation.mutate(payload);
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	const filteredCategories =
		categories.data?.filter((c) => c.type === watchedType || c.type === "both") ?? [];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold">Recurring Transactions</h1>
				<button
					type="button"
					onClick={openCreate}
					className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
				>
					+ New
				</button>
			</div>

			{/* List */}
			{recurringQuery.isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

			{recurringQuery.data && recurringQuery.data.length === 0 && (
				<EmptyState
					icon="🔁"
					title="No recurring transactions"
					description="Set up automatic transactions that repeat on a schedule."
					action={{ label: "+ Add Recurring", onClick: openCreate }}
				/>
			)}

			{recurringQuery.data && recurringQuery.data.length > 0 && (
				<div className="overflow-x-auto rounded-lg border bg-card">
					<table className="w-full text-sm">
						<caption className="sr-only">Recurring transactions list</caption>
						<thead>
							<tr className="border-b bg-muted/50">
								<th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
									Description
								</th>
								<th scope="col" className="px-4 py-3 text-right font-medium text-muted-foreground">
									Amount
								</th>
								<th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
									Type
								</th>
								<th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
									Frequency
								</th>
								<th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
									Account
								</th>
								<th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
									Category
								</th>
								<th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
									Start Date
								</th>
								<th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
									Status
								</th>
								<th scope="col" className="px-4 py-3 text-right font-medium text-muted-foreground">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{recurringQuery.data.map((row) => (
								<tr key={row.id} className="hover:bg-muted/30">
									<td className="px-4 py-3 font-medium">{row.description}</td>
									<td className="px-4 py-3 text-right tabular-nums">
										{formatCurrency(row.amount)}
									</td>
									<td className="px-4 py-3">
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
												row.type === "income"
													? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
													: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
											}`}
										>
											{row.type}
										</span>
									</td>
									<td className="px-4 py-3 text-muted-foreground">
										{frequencyLabels[row.frequency] ?? row.frequency}
									</td>
									<td className="px-4 py-3 text-muted-foreground">{row.accountName ?? "—"}</td>
									<td className="px-4 py-3 text-muted-foreground">{row.categoryName ?? "—"}</td>
									<td className="px-4 py-3 text-muted-foreground">{formatDate(row.startDate)}</td>
									<td className="px-4 py-3">
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
												row.isActive
													? "bg-primary/10 text-primary"
													: "bg-muted text-muted-foreground"
											}`}
										>
											{row.isActive ? "Active" : "Paused"}
										</span>
									</td>
									<td className="px-4 py-3">
										<div className="flex items-center justify-end gap-1">
											<button
												type="button"
												onClick={() => toggleMutation.mutate({ id: row.id })}
												disabled={toggleMutation.isPending}
												className="rounded px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
											>
												{row.isActive ? "Pause" : "Resume"}
											</button>
											<button
												type="button"
												onClick={() => openEdit(row)}
												className="rounded px-2 py-1 text-xs hover:bg-accent"
											>
												Edit
											</button>
											<button
												type="button"
												onClick={() => setDeletingId(row.id)}
												className="rounded px-2 py-1 text-xs text-destructive hover:bg-red-50 dark:hover:bg-red-900/20"
											>
												Delete
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Create / Edit Modal */}
			<Modal
				open={formOpen}
				onClose={closeForm}
				title={editingId ? "Edit Recurring Transaction" : "New Recurring Transaction"}
			>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<div>
						<label htmlFor="rec-description" className="mb-1 block text-sm font-medium">
							Description
						</label>
						<Controller
							control={form.control}
							name="description"
							render={({ field }) => (
								<Autocomplete
									id="rec-description"
									value={field.value}
									onChange={field.onChange}
									onBlur={field.onBlur}
									name={field.name}
									suggestions={suggestions.data ?? []}
									placeholder="e.g. Netflix subscription"
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

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<label htmlFor="rec-amount" className="mb-1 block text-sm font-medium">
								Amount ($)
							</label>
							<input
								id="rec-amount"
								type="text"
								inputMode="decimal"
								placeholder="0.00"
								{...form.register("amountDollars", {
									onBlur: (e) => {
										const val = Number.parseFloat(e.target.value);
										if (!Number.isNaN(val) && val > 0)
											form.setValue("amountDollars", val.toFixed(2));
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

						<div>
							<label htmlFor="rec-type" className="mb-1 block text-sm font-medium">
								Type
							</label>
							<select
								id="rec-type"
								{...form.register("type")}
								className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
							>
								<option value="expense">Expense</option>
								<option value="income">Income</option>
							</select>
						</div>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<label htmlFor="rec-frequency" className="mb-1 block text-sm font-medium">
								Frequency
							</label>
							<select
								id="rec-frequency"
								{...form.register("frequency")}
								className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
							>
								{frequencies.map((f) => (
									<option key={f} value={f}>
										{frequencyLabels[f]}
									</option>
								))}
							</select>
						</div>

						<div>
							<label htmlFor="rec-account" className="mb-1 block text-sm font-medium">
								Account
							</label>
							<select
								id="rec-account"
								{...form.register("accountId", { valueAsNumber: true })}
								className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
							>
								<option value={0}>Select account...</option>
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
					</div>

					<div>
						<label htmlFor="rec-category" className="mb-1 block text-sm font-medium">
							Category <span className="text-muted-foreground font-normal">(optional)</span>
						</label>
						<select
							id="rec-category"
							{...form.register("categoryId", {
								setValueAs: (v) => (v === "" || v === "0" ? null : Number(v)),
							})}
							className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="0">No category</option>
							{filteredCategories.map((c) => (
								<option key={c.id} value={c.id}>
									{c.groupName ? `${c.groupName} › ` : ""}
									{c.name}
								</option>
							))}
						</select>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<label htmlFor="rec-start" className="mb-1 block text-sm font-medium">
								Start Date
							</label>
							<input
								id="rec-start"
								type="date"
								{...form.register("startDate")}
								className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
							/>
							{form.formState.errors.startDate && (
								<p className="mt-1 text-xs text-destructive">
									{form.formState.errors.startDate.message}
								</p>
							)}
						</div>

						<div>
							<label htmlFor="rec-end" className="mb-1 block text-sm font-medium">
								End Date <span className="text-muted-foreground font-normal">(optional)</span>
							</label>
							<input
								id="rec-end"
								type="date"
								{...form.register("endDate", {
									setValueAs: (v) => (v === "" ? null : v),
								})}
								className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
							/>
						</div>
					</div>

					{(createMutation.error || updateMutation.error) && (
						<p className="text-sm text-destructive">
							{createMutation.error?.message || updateMutation.error?.message}
						</p>
					)}

					<div className="flex justify-end gap-2 pt-2">
						<button
							type="button"
							onClick={closeForm}
							className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isPending}
							className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
						>
							{isPending ? "Saving..." : editingId ? "Update" : "Save"}
						</button>
					</div>
				</form>
			</Modal>

			<ConfirmDialog
				open={deletingId !== null}
				onClose={() => setDeletingId(null)}
				title="Delete Recurring Transaction"
				description="Are you sure? This won't delete existing transactions that were already created."
				isPending={deleteMutation.isPending}
				onConfirm={() => deletingId !== null && deleteMutation.mutate({ id: deletingId })}
			/>
		</div>
	);
}
