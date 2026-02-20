import { trpc } from "../../lib/trpc";

interface FilterValues {
	search: string;
	type: string;
	categoryId: string;
	accountId: string;
	dateFrom: string;
	dateTo: string;
}

interface TransactionFiltersProps {
	filters: FilterValues;
	onChange: (filters: FilterValues) => void;
}

export function TransactionFilters({ filters, onChange }: TransactionFiltersProps) {
	const categories = trpc.category.list.useQuery();
	const accounts = trpc.account.list.useQuery();

	const set = (key: keyof FilterValues, value: string) => {
		onChange({ ...filters, [key]: value });
	};

	return (
		<div className="flex flex-wrap items-end gap-3">
			<div className="min-w-[200px] flex-1">
				<label htmlFor="filter-search" className="sr-only">
					Search transactions
				</label>
				<input
					id="filter-search"
					type="text"
					placeholder="Search description..."
					value={filters.search}
					onChange={(e) => set("search", e.target.value)}
					className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
				/>
			</div>

			<div>
				<label htmlFor="filter-type" className="sr-only">
					Transaction type
				</label>
				<select
					id="filter-type"
					value={filters.type}
					onChange={(e) => set("type", e.target.value)}
					className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
				>
					<option value="">All Types</option>
					<option value="income">Income</option>
					<option value="expense">Expense</option>
					<option value="transfer">Transfer</option>
				</select>
			</div>

			<div>
				<label htmlFor="filter-category" className="sr-only">
					Category
				</label>
				<select
					id="filter-category"
					value={filters.categoryId}
					onChange={(e) => set("categoryId", e.target.value)}
					className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
				>
					<option value="">All Categories</option>
					{categories.data?.map((c) => (
						<option key={c.id} value={c.id}>
							{c.name}
						</option>
					))}
				</select>
			</div>

			<div>
				<label htmlFor="filter-account" className="sr-only">
					Account
				</label>
				<select
					id="filter-account"
					value={filters.accountId}
					onChange={(e) => set("accountId", e.target.value)}
					className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
				>
					<option value="">All Accounts</option>
					{accounts.data?.map((a) => (
						<option key={a.id} value={a.id}>
							{a.name}
						</option>
					))}
				</select>
			</div>

			<div>
				<label htmlFor="filter-date-from" className="sr-only">
					From date
				</label>
				<input
					id="filter-date-from"
					type="date"
					value={filters.dateFrom}
					onChange={(e) => set("dateFrom", e.target.value)}
					className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
				/>
			</div>

			<div>
				<label htmlFor="filter-date-to" className="sr-only">
					To date
				</label>
				<input
					id="filter-date-to"
					type="date"
					value={filters.dateTo}
					onChange={(e) => set("dateTo", e.target.value)}
					className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
				/>
			</div>

			{(filters.search ||
				filters.type ||
				filters.categoryId ||
				filters.accountId ||
				filters.dateFrom ||
				filters.dateTo) && (
				<button
					type="button"
					onClick={() =>
						onChange({
							search: "",
							type: "",
							categoryId: "",
							accountId: "",
							dateFrom: "",
							dateTo: "",
						})
					}
					className="rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
				>
					Clear
				</button>
			)}
		</div>
	);
}
