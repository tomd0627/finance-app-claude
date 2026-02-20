import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { createBudgetSchema } from "shared";
import { z } from "zod";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { EmptyState } from "../../components/ui/empty-state";
import { Modal } from "../../components/ui/modal";
import { trpc } from "../../lib/trpc";
import { useKeyboardShortcut } from "../../lib/use-keyboard-shortcut";
import { formatCurrency } from "../../lib/utils";

const budgetFormSchema = createBudgetSchema.omit({ amount: true }).extend({
	amountDollars: z.string().min(1, "Amount is required"),
});
type BudgetFormValues = z.infer<typeof budgetFormSchema>;

export function Budgets() {
	const now = new Date();
	const [year, setYear] = useState(now.getFullYear());
	const [month, setMonth] = useState(now.getMonth() + 1);
	const [formOpen, setFormOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [deletingId, setDeletingId] = useState<number | null>(null);

	const utils = trpc.useUtils();
	const budgets = trpc.budget.listWithSpending.useQuery({ year, month });
	const categories = trpc.category.list.useQuery();

	const form = useForm<BudgetFormValues>({
		resolver: zodResolver(budgetFormSchema),
		defaultValues: {
			categoryId: 0,
			year,
			month,
			amountDollars: "",
			rollover: false,
		},
	});

	const upsertMutation = trpc.budget.upsert.useMutation({
		onSuccess: () => {
			utils.budget.invalidate();
			closeForm();
		},
	});

	const updateMutation = trpc.budget.update.useMutation({
		onSuccess: () => {
			utils.budget.invalidate();
			closeForm();
		},
	});

	const deleteMutation = trpc.budget.delete.useMutation({
		onSuccess: () => {
			utils.budget.invalidate();
			setDeletingId(null);
		},
	});

	const closeForm = () => {
		setFormOpen(false);
		setEditingId(null);
		form.reset({ categoryId: 0, year, month, amountDollars: "", rollover: false });
	};

	const openCreate = () => {
		form.reset({ categoryId: 0, year, month, amountDollars: "", rollover: false });
		setEditingId(null);
		setFormOpen(true);
	};

	useKeyboardShortcut("n", openCreate);

	const openEdit = (budget: {
		id: number;
		categoryId: number;
		year: number;
		month: number;
		amount: number;
		rollover: boolean;
	}) => {
		form.reset({
			categoryId: budget.categoryId,
			year: budget.year,
			month: budget.month,
			amountDollars: (budget.amount / 100).toFixed(2),
			rollover: budget.rollover,
		});
		setEditingId(budget.id);
		setFormOpen(true);
	};

	const onSubmit = (values: BudgetFormValues) => {
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
			upsertMutation.mutate(payload);
		}
	};

	const monthLabel = new Date(year, month - 1).toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
	});

	const prevMonth = () => {
		if (month === 1) {
			setYear(year - 1);
			setMonth(12);
		} else {
			setMonth(month - 1);
		}
	};

	const nextMonth = () => {
		if (month === 12) {
			setYear(year + 1);
			setMonth(1);
		} else {
			setMonth(month + 1);
		}
	};

	const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
	const isPending = upsertMutation.isPending || updateMutation.isPending;

	// Categories not yet budgeted this month
	const budgetedCategoryIds = new Set(budgets.data?.map((b) => b.categoryId) ?? []);
	const availableCategories =
		categories.data?.filter(
			(c) => c.type !== "income" && (editingId !== null || !budgetedCategoryIds.has(c.id)),
		) ?? [];

	const totalBudgeted = budgets.data?.reduce((sum, b) => sum + b.amount, 0) ?? 0;
	const totalSpent = budgets.data?.reduce((sum, b) => sum + b.spent, 0) ?? 0;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold">Budgets</h1>
				<button
					type="button"
					onClick={openCreate}
					className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
				>
					+ Add Budget
				</button>
			</div>

			{/* Month navigator */}
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={prevMonth}
					aria-label="Previous month"
					className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
				>
					&#8249;
				</button>
				<span className="min-w-[140px] text-center text-sm font-medium" aria-live="polite">
					{monthLabel}
				</span>
				<button
					type="button"
					onClick={nextMonth}
					aria-label="Next month"
					disabled={isCurrentMonth}
					className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-40"
				>
					&#8250;
				</button>
			</div>

			{/* Overall summary bar */}
			{budgets.data && budgets.data.length > 0 && (
				<div className="rounded-lg border bg-card p-5">
					<div className="mb-2 flex items-center justify-between text-sm">
						<span className="font-medium">Total</span>
						<span className="text-muted-foreground">
							{formatCurrency(totalSpent)} / {formatCurrency(totalBudgeted)}
						</span>
					</div>
					<ProgressBar
						percentage={
							totalBudgeted > 0 ? Math.min(100, Math.round((totalSpent / totalBudgeted) * 100)) : 0
						}
					/>
				</div>
			)}

			{/* Budget list */}
			<div className="space-y-3">
				{budgets.isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

				{budgets.data && budgets.data.length === 0 && (
					<EmptyState
						icon="🎯"
						title="No budgets for this month"
						description="Set spending limits for your categories to stay on track."
						action={{ label: "+ Add Budget", onClick: openCreate }}
					/>
				)}

				{budgets.data?.map((budget) => (
					<div key={budget.id} className="rounded-lg border bg-card p-5">
						<div className="mb-3 flex items-start justify-between gap-4">
							<div className="flex items-center gap-2.5">
								{budget.categoryColor && (
									<span
										className="inline-block h-3 w-3 flex-shrink-0 rounded-full"
										style={{ backgroundColor: budget.categoryColor }}
									/>
								)}
								<div>
									<p className="font-medium">{budget.categoryName ?? "Unknown"}</p>
									{budget.categoryGroup && (
										<p className="text-xs text-muted-foreground">{budget.categoryGroup}</p>
									)}
								</div>
							</div>

							<div className="flex items-center gap-3">
								<div className="text-right">
									<p className="text-sm font-semibold">
										<span
											className={budget.percentage >= 100 ? "text-destructive" : "text-foreground"}
										>
											{formatCurrency(budget.spent)}
										</span>
										<span className="text-muted-foreground">
											{" "}
											/ {formatCurrency(budget.amount)}
										</span>
									</p>
									<p className="text-xs text-muted-foreground">
										{budget.remaining >= 0
											? `${formatCurrency(budget.remaining)} left`
											: `${formatCurrency(-budget.remaining)} over`}
									</p>
								</div>
								<div className="flex gap-1">
									<button
										type="button"
										onClick={() => openEdit(budget)}
										className="rounded px-2 py-1 text-xs hover:bg-accent"
									>
										Edit
									</button>
									<button
										type="button"
										onClick={() => setDeletingId(budget.id)}
										className="rounded px-2 py-1 text-xs text-destructive hover:bg-red-50 dark:hover:bg-red-900/20"
									>
										Delete
									</button>
								</div>
							</div>
						</div>

						<ProgressBar percentage={budget.percentage} />

						<p className="mt-1.5 text-right text-xs text-muted-foreground">
							{budget.percentage}% used
						</p>
					</div>
				))}
			</div>

			{/* Budget Form Modal */}
			<Modal open={formOpen} onClose={closeForm} title={editingId ? "Edit Budget" : "Add Budget"}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<div>
						<label htmlFor="budget-category" className="mb-1 block text-sm font-medium">
							Category
						</label>
						<select
							id="budget-category"
							disabled={!!editingId}
							{...form.register("categoryId", { valueAsNumber: true })}
							className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
						>
							<option value={0}>Select category...</option>
							{availableCategories.map((c) => (
								<option key={c.id} value={c.id}>
									{c.groupName ? `${c.groupName} › ` : ""}
									{c.name}
								</option>
							))}
						</select>
						{form.formState.errors.categoryId && (
							<p className="mt-1 text-xs text-destructive">
								{form.formState.errors.categoryId.message}
							</p>
						)}
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<label htmlFor="budget-amount" className="mb-1 block text-sm font-medium">
								Budget Amount ($)
							</label>
							<input
								id="budget-amount"
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

						<div className="flex flex-col justify-end">
							<label className="flex cursor-pointer items-center gap-2">
								<input
									type="checkbox"
									{...form.register("rollover")}
									className="h-4 w-4 rounded border"
								/>
								<span className="text-sm">Rollover unspent</span>
							</label>
						</div>
					</div>

					{(upsertMutation.error || updateMutation.error) && (
						<p className="text-sm text-destructive">
							{upsertMutation.error?.message || updateMutation.error?.message}
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
							{isPending ? "Saving..." : editingId ? "Update" : "Save Budget"}
						</button>
					</div>
				</form>
			</Modal>

			<ConfirmDialog
				open={deletingId !== null}
				onClose={() => setDeletingId(null)}
				title="Delete Budget"
				description="Are you sure? This will remove the budget for this category."
				isPending={deleteMutation.isPending}
				onConfirm={() => deletingId !== null && deleteMutation.mutate({ id: deletingId })}
			/>
		</div>
	);
}

function ProgressBar({ percentage, label }: { percentage: number; label?: string }) {
	const isOver = percentage >= 100;
	const isWarning = percentage >= 80 && !isOver;
	const clamped = Math.min(100, percentage);

	return (
		<div
			className="h-2 w-full overflow-hidden rounded-full bg-secondary"
			role="progressbar"
			tabIndex={0}
			aria-valuenow={clamped}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-label={label ?? `${clamped}% used`}
		>
			<div
				className={`h-full rounded-full transition-all ${
					isOver ? "bg-destructive" : isWarning ? "bg-amber-500" : "bg-primary"
				}`}
				style={{ width: `${clamped}%` }}
			/>
		</div>
	);
}
