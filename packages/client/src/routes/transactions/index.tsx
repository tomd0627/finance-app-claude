import { useState } from "react";
import { TransactionFilters } from "../../components/transactions/transaction-filters";
import { TransactionForm } from "../../components/transactions/transaction-form";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { EmptyState } from "../../components/ui/empty-state";
import { trpc } from "../../lib/trpc";
import { useKeyboardShortcut } from "../../lib/use-keyboard-shortcut";
import { formatCurrency, formatDate } from "../../lib/utils";

interface Filters {
	search: string;
	type: string;
	categoryId: string;
	accountId: string;
	dateFrom: string;
	dateTo: string;
}

const emptyFilters: Filters = {
	search: "",
	type: "",
	categoryId: "",
	accountId: "",
	dateFrom: "",
	dateTo: "",
};

export function Transactions() {
	const [filters, setFilters] = useState<Filters>(emptyFilters);
	const [page, setPage] = useState(1);
	const [sortBy, setSortBy] = useState<"date" | "amount" | "description">("date");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
	const [formOpen, setFormOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [deletingId, setDeletingId] = useState<number | null>(null);

	const utils = trpc.useUtils();

	const query = trpc.transaction.list.useQuery({
		search: filters.search || undefined,
		type: (filters.type as "income" | "expense" | "transfer") || undefined,
		categoryId: filters.categoryId ? Number(filters.categoryId) : undefined,
		accountId: filters.accountId ? Number(filters.accountId) : undefined,
		dateFrom: filters.dateFrom || undefined,
		dateTo: filters.dateTo || undefined,
		page,
		pageSize: 20,
		sortBy,
		sortOrder,
	});

	const deleteMutation = trpc.transaction.delete.useMutation({
		onSuccess: () => {
			utils.transaction.list.invalidate();
			utils.dashboard.invalidate();
			setDeletingId(null);
		},
	});

	const handleSort = (column: "date" | "amount" | "description") => {
		if (sortBy === column) {
			setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		} else {
			setSortBy(column);
			setSortOrder(column === "date" ? "desc" : "asc");
		}
	};

	const sortIndicator = (column: string) => {
		if (sortBy !== column) return "";
		return sortOrder === "asc" ? " \u2191" : " \u2193";
	};

	const openEdit = (id: number) => {
		setEditingId(id);
		setFormOpen(true);
	};

	const openCreate = () => {
		setEditingId(null);
		setFormOpen(true);
	};

	useKeyboardShortcut("n", openCreate);

	const hasFilters = Object.values(filters).some(Boolean);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold">Transactions</h1>
				<button
					type="button"
					onClick={openCreate}
					className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
				>
					+ Add Transaction
				</button>
			</div>

			<TransactionFilters
				filters={filters}
				onChange={(f) => {
					setFilters(f);
					setPage(1);
				}}
			/>

			<div className="overflow-x-auto rounded-lg border bg-card">
				<table className="w-full text-sm">
					<caption className="sr-only">Transactions list</caption>
					<thead>
						<tr className="border-b text-left text-muted-foreground">
							<th
								scope="col"
								className="px-4 py-3 font-medium"
								aria-sort={
									sortBy === "date" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"
								}
							>
								<button
									type="button"
									className="hover:text-foreground"
									onClick={() => handleSort("date")}
								>
									Date{sortIndicator("date")}
								</button>
							</th>
							<th
								scope="col"
								className="px-4 py-3 font-medium"
								aria-sort={
									sortBy === "description"
										? sortOrder === "asc"
											? "ascending"
											: "descending"
										: "none"
								}
							>
								<button
									type="button"
									className="hover:text-foreground"
									onClick={() => handleSort("description")}
								>
									Description{sortIndicator("description")}
								</button>
							</th>
							<th scope="col" className="px-4 py-3 font-medium">
								Category
							</th>
							<th scope="col" className="px-4 py-3 font-medium">
								Account
							</th>
							<th
								scope="col"
								className="px-4 py-3 text-right font-medium"
								aria-sort={
									sortBy === "amount" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"
								}
							>
								<button
									type="button"
									className="hover:text-foreground"
									onClick={() => handleSort("amount")}
								>
									Amount{sortIndicator("amount")}
								</button>
							</th>
							<th scope="col" className="px-4 py-3 text-right font-medium">
								Actions
							</th>
						</tr>
					</thead>
					<tbody>
						{query.isLoading && (
							<tr>
								<td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
									Loading...
								</td>
							</tr>
						)}
						{query.data && query.data.items.length === 0 && (
							<tr>
								<td colSpan={6}>
									<EmptyState
										icon="💳"
										title={hasFilters ? "No matching transactions" : "No transactions yet"}
										description={
											hasFilters
												? "Try adjusting or clearing your filters."
												: "Add your first transaction to get started."
										}
										action={
											hasFilters ? undefined : { label: "+ Add Transaction", onClick: openCreate }
										}
									/>
								</td>
							</tr>
						)}
						{query.data?.items.map((tx) => (
							<tr key={tx.id} className="border-b last:border-0 hover:bg-accent/50">
								<td className="px-4 py-3 whitespace-nowrap">{formatDate(tx.date)}</td>
								<td className="px-4 py-3">
									<div>{tx.description}</div>
									{tx.notes && (
										<div className="text-xs text-muted-foreground truncate max-w-[250px]">
											{tx.notes}
										</div>
									)}
								</td>
								<td className="px-4 py-3">
									{tx.categoryName && (
										<span className="inline-flex items-center gap-1.5">
											{tx.categoryColor && (
												<span
													className="inline-block h-2.5 w-2.5 rounded-full"
													style={{ backgroundColor: tx.categoryColor }}
												/>
											)}
											{tx.categoryName}
										</span>
									)}
								</td>
								<td className="px-4 py-3 whitespace-nowrap">{tx.accountName}</td>
								<td
									className={`px-4 py-3 text-right font-medium whitespace-nowrap ${
										tx.type === "income"
											? "text-green-600 dark:text-green-400"
											: tx.type === "expense"
												? "text-red-600 dark:text-red-400"
												: "text-blue-600 dark:text-blue-400"
									}`}
								>
									{tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}
									{formatCurrency(tx.amount)}
								</td>
								<td className="px-4 py-3 text-right">
									<div className="flex justify-end gap-1">
										<button
											type="button"
											onClick={() => openEdit(tx.id)}
											className="rounded px-2 py-1 text-xs hover:bg-accent"
										>
											Edit
										</button>
										<button
											type="button"
											onClick={() => setDeletingId(tx.id)}
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

			{/* Pagination */}
			{query.data && query.data.totalPages > 1 && (
				<div className="flex items-center justify-between">
					<p className="text-sm text-muted-foreground">
						Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, query.data.total)} of{" "}
						{query.data.total}
					</p>
					<div className="flex gap-1">
						<button
							type="button"
							disabled={page === 1}
							onClick={() => setPage(page - 1)}
							className="rounded-md border px-3 py-1 text-sm disabled:opacity-50 hover:bg-accent"
						>
							Previous
						</button>
						{Array.from({ length: Math.min(query.data.totalPages, 7) }, (_, i) => {
							let pageNum: number;
							const total = query.data?.totalPages ?? 1;
							if (total <= 7) {
								pageNum = i + 1;
							} else if (page <= 4) {
								pageNum = i + 1;
							} else if (page >= total - 3) {
								pageNum = total - 6 + i;
							} else {
								pageNum = page - 3 + i;
							}
							return (
								<button
									key={pageNum}
									type="button"
									onClick={() => setPage(pageNum)}
									className={`rounded-md border px-3 py-1 text-sm ${
										page === pageNum ? "bg-primary text-primary-foreground" : "hover:bg-accent"
									}`}
								>
									{pageNum}
								</button>
							);
						})}
						<button
							type="button"
							disabled={page === query.data.totalPages}
							onClick={() => setPage(page + 1)}
							className="rounded-md border px-3 py-1 text-sm disabled:opacity-50 hover:bg-accent"
						>
							Next
						</button>
					</div>
				</div>
			)}

			{/* Transaction Form Modal */}
			<TransactionForm
				open={formOpen}
				onClose={() => {
					setFormOpen(false);
					setEditingId(null);
				}}
				editingId={editingId}
			/>

			<ConfirmDialog
				open={deletingId !== null}
				onClose={() => setDeletingId(null)}
				title="Delete Transaction"
				description="Are you sure? This action cannot be undone."
				isPending={deleteMutation.isPending}
				onConfirm={() => deletingId !== null && deleteMutation.mutate({ id: deletingId })}
			/>
		</div>
	);
}
