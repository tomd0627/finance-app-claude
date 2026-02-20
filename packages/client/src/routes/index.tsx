import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SpendingChart } from "../components/dashboard/spending-chart";
import { TrendChart } from "../components/dashboard/trend-chart";
import { EmptyState } from "../components/ui/empty-state";
import { trpc } from "../lib/trpc";
import { formatCurrency, formatDate } from "../lib/utils";

export function Dashboard() {
	const now = new Date();
	const [year, setYear] = useState(now.getFullYear());
	const [month, setMonth] = useState(now.getMonth() + 1);
	const navigate = useNavigate();

	const summary = trpc.dashboard.monthlySummary.useQuery({ year, month });
	const recent = trpc.dashboard.recentTransactions.useQuery({ limit: 5 });
	const trend = trpc.dashboard.monthlyTrend.useQuery();

	const dateFrom = `${year}-${String(month).padStart(2, "0")}-01`;
	const lastDay = new Date(year, month, 0).getDate();
	const dateTo = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
	const spending = trpc.dashboard.spendingByCategory.useQuery({ dateFrom, dateTo });

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

	return (
		<div className="space-y-6">
			{/* Header with month navigator */}
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold">Dashboard</h1>
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
			</div>

			{/* Summary cards */}
			<div className="grid gap-4 md:grid-cols-3">
				<SummaryCard
					title="Income"
					value={summary.data?.income ?? 0}
					valueClass="text-green-600 dark:text-green-400"
					loading={summary.isLoading}
				/>
				<SummaryCard
					title="Expenses"
					value={summary.data?.expenses ?? 0}
					valueClass="text-red-600 dark:text-red-400"
					loading={summary.isLoading}
				/>
				<SummaryCard
					title="Net"
					value={summary.data?.net ?? 0}
					valueClass={
						(summary.data?.net ?? 0) >= 0
							? "text-green-600 dark:text-green-400"
							: "text-red-600 dark:text-red-400"
					}
					loading={summary.isLoading}
				/>
			</div>

			{/* Charts row */}
			<div className="grid gap-4 lg:grid-cols-2">
				<div className="rounded-lg border bg-card p-5">
					<h2 className="mb-4 text-base font-semibold">Spending by Category</h2>
					{spending.isLoading ? (
						<div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
							Loading...
						</div>
					) : (
						<SpendingChart data={spending.data ?? []} />
					)}
				</div>

				<div className="rounded-lg border bg-card p-5">
					<h2 className="mb-4 text-base font-semibold">Income vs Expenses (6 months)</h2>
					{trend.isLoading ? (
						<div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
							Loading...
						</div>
					) : (
						<TrendChart data={trend.data ?? []} />
					)}
				</div>
			</div>

			{/* Recent transactions */}
			<div className="rounded-lg border bg-card p-5">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-base font-semibold">Recent Transactions</h2>
					<Link to="/transactions" className="text-sm text-primary hover:underline">
						View all
					</Link>
				</div>

				{recent.data && recent.data.length > 0 ? (
					<div className="divide-y">
						{recent.data.map((tx) => (
							<div key={tx.id} className="flex items-center justify-between py-2.5">
								<div>
									<p className="text-sm font-medium">{tx.description}</p>
									<p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
								</div>
								<span
									className={`text-sm font-semibold ${
										tx.type === "income"
											? "text-green-600 dark:text-green-400"
											: tx.type === "expense"
												? "text-red-600 dark:text-red-400"
												: "text-blue-600 dark:text-blue-400"
									}`}
								>
									{tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}
									{formatCurrency(tx.amount)}
								</span>
							</div>
						))}
					</div>
				) : (
					<EmptyState
						icon="📊"
						title="No transactions yet"
						description="Add a transaction to start seeing your finances here."
						action={{ label: "Add Transaction", onClick: () => navigate("/transactions") }}
					/>
				)}
			</div>
		</div>
	);
}

function SummaryCard({
	title,
	value,
	valueClass,
	loading,
}: {
	title: string;
	value: number;
	valueClass: string;
	loading?: boolean;
}) {
	return (
		<div className="rounded-lg border bg-card p-6">
			<p className="text-sm text-muted-foreground">{title}</p>
			{loading ? (
				<div className="mt-1 h-8 w-24 animate-pulse rounded bg-muted" />
			) : (
				<p className={`text-2xl font-bold ${valueClass}`}>{formatCurrency(value)}</p>
			)}
		</div>
	);
}
