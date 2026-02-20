import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { type CreateAccountInput, accountTypes, createAccountSchema } from "shared";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { EmptyState } from "../../components/ui/empty-state";
import { Modal } from "../../components/ui/modal";
import { trpc } from "../../lib/trpc";
import { useKeyboardShortcut } from "../../lib/use-keyboard-shortcut";
import { formatCurrency } from "../../lib/utils";

const accountTypeLabels: Record<string, string> = {
	checking: "Checking",
	savings: "Savings",
	credit_card: "Credit Card",
	cash: "Cash",
};

export function Accounts() {
	const [formOpen, setFormOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [deletingId, setDeletingId] = useState<number | null>(null);

	const utils = trpc.useUtils();
	const accounts = trpc.account.listWithBalances.useQuery();

	const form = useForm<CreateAccountInput>({
		resolver: zodResolver(createAccountSchema),
		defaultValues: { name: "", type: "checking" },
	});

	const createMutation = trpc.account.create.useMutation({
		onSuccess: () => {
			utils.account.invalidate();
			closeForm();
		},
	});

	const updateMutation = trpc.account.update.useMutation({
		onSuccess: () => {
			utils.account.invalidate();
			closeForm();
		},
	});

	const deleteMutation = trpc.account.delete.useMutation({
		onSuccess: () => {
			utils.account.invalidate();
			setDeletingId(null);
		},
	});

	const closeForm = () => {
		setFormOpen(false);
		setEditingId(null);
		form.reset({ name: "", type: "checking" });
	};

	const openCreate = () => {
		form.reset({ name: "", type: "checking" });
		setEditingId(null);
		setFormOpen(true);
	};

	useKeyboardShortcut("n", openCreate);

	const openEdit = (account: { id: number; name: string; type: string }) => {
		form.reset({ name: account.name, type: account.type as CreateAccountInput["type"] });
		setEditingId(account.id);
		setFormOpen(true);
	};

	const onSubmit = (values: CreateAccountInput) => {
		if (editingId) {
			updateMutation.mutate({ id: editingId, data: values });
		} else {
			createMutation.mutate(values);
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold">Accounts</h1>
				<button
					type="button"
					onClick={openCreate}
					className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
				>
					+ Add Account
				</button>
			</div>

			{accounts.data && accounts.data.length === 0 ? (
				<EmptyState
					icon="🏦"
					title="No accounts yet"
					description="Add an account to start tracking your finances."
					action={{ label: "+ Add Account", onClick: openCreate }}
				/>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{accounts.data?.map((account) => (
						<div key={account.id} className="rounded-lg border bg-card p-5">
							<div className="flex items-start justify-between">
								<div>
									<h3 className="font-semibold">{account.name}</h3>
									<p className="text-sm text-muted-foreground">
										{accountTypeLabels[account.type] ?? account.type}
									</p>
								</div>
								<div className="flex gap-1">
									<button
										type="button"
										onClick={() => openEdit(account)}
										className="rounded px-2 py-1 text-xs hover:bg-accent"
									>
										Edit
									</button>
									<button
										type="button"
										onClick={() => setDeletingId(account.id)}
										className="rounded px-2 py-1 text-xs text-destructive hover:bg-red-50"
									>
										Delete
									</button>
								</div>
							</div>
							<p
								className={`mt-3 text-2xl font-bold ${account.balance >= 0 ? "text-green-600" : "text-red-600"}`}
							>
								{formatCurrency(account.balance)}
							</p>
						</div>
					))}
				</div>
			)}

			{/* Account Form Modal */}
			<Modal open={formOpen} onClose={closeForm} title={editingId ? "Edit Account" : "Add Account"}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<div>
						<label htmlFor="account-name" className="mb-1 block text-sm font-medium">
							Name
						</label>
						<input
							id="account-name"
							type="text"
							placeholder="e.g., Main Checking"
							{...form.register("name")}
							className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
						/>
						{form.formState.errors.name && (
							<p className="mt-1 text-xs text-destructive">{form.formState.errors.name.message}</p>
						)}
					</div>

					<div>
						<label htmlFor="account-type" className="mb-1 block text-sm font-medium">
							Type
						</label>
						<select
							id="account-type"
							{...form.register("type")}
							className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
						>
							{accountTypes.map((t) => (
								<option key={t} value={t}>
									{accountTypeLabels[t] ?? t}
								</option>
							))}
						</select>
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
							{isPending ? "Saving..." : editingId ? "Update" : "Add Account"}
						</button>
					</div>
				</form>
			</Modal>

			<ConfirmDialog
				open={deletingId !== null}
				onClose={() => setDeletingId(null)}
				title="Delete Account"
				description="Are you sure? Transactions linked to this account will lose their account reference."
				isPending={deleteMutation.isPending}
				onConfirm={() => deletingId !== null && deleteMutation.mutate({ id: deletingId })}
			/>
		</div>
	);
}
