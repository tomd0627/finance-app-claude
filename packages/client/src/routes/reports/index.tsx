import { useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { downloadCsv } from "../../lib/csv";
import { trpc } from "../../lib/trpc";
import { formatCurrency } from "../../lib/utils";

// ─── Date range presets ────────────────────────────────────────────────────────

type Preset = "this-month" | "last-month" | "last-3" | "last-6" | "this-year" | "custom";

function getPresetRange(preset: Preset): { dateFrom: string; dateTo: string } {
	const now = new Date();
	const y = now.getFullYear();
	const m = now.getMonth(); // 0-based

	const iso = (d: Date) => d.toISOString().slice(0, 10);
	const firstOfMonth = (year: number, month: number) => new Date(year, month, 1);
	const lastOfMonth = (year: number, month: number) => new Date(year, month + 1, 0);

	switch (preset) {
		case "this-month":
			return { dateFrom: iso(firstOfMonth(y, m)), dateTo: iso(lastOfMonth(y, m)) };
		case "last-month":
			return { dateFrom: iso(firstOfMonth(y, m - 1)), dateTo: iso(lastOfMonth(y, m - 1)) };
		case "last-3":
			return { dateFrom: iso(firstOfMonth(y, m - 2)), dateTo: iso(lastOfMonth(y, m)) };
		case "last-6":
			return { dateFrom: iso(firstOfMonth(y, m - 5)), dateTo: iso(lastOfMonth(y, m)) };
		case "this-year":
			return { dateFrom: `${y}-01-01`, dateTo: `${y}-12-31` };
		default:
			return { dateFrom: iso(firstOfMonth(y, m)), dateTo: iso(lastOfMonth(y, m)) };
	}
}

const PRESET_LABELS: Record<Preset, string> = {
	"this-month": "This Month",
	"last-month": "Last Month",
	"last-3": "Last 3 Months",
	"last-6": "Last 6 Months",
	"this-year": "This Year",
	custom: "Custom",
};

const FALLBACK_COLORS = [
	"#6366f1",
	"#f59e0b",
	"#10b981",
	"#ef4444",
	"#8b5cf6",
	"#ec4899",
	"#14b8a6",
	"#f97316",
	"#3b82f6",
	"#84cc16",
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Reports() {
	const now = new Date();
	const [preset, setPreset] = useState<Preset>("this-month");
	const [customFrom, setCustomFrom] = useState(
		`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
	);
	const [customTo, setCustomTo] = useState(now.toISOString().slice(0, 10));

	const { dateFrom, dateTo } =
		preset === "custom" ? { dateFrom: customFrom, dateTo: customTo } : getPresetRange(preset);

	const summary = trpc.report.summary.useQuery({ dateFrom, dateTo });
	const spending = trpc.report.spendingByCategory.useQuery({ dateFrom, dateTo });
	const breakdown = trpc.report.monthlyBreakdown.useQuery({ dateFrom, dateTo });
	const exportQ = trpc.report.exportTransactions.useQuery(
		{ dateFrom, dateTo },
		{ enabled: false }, // only fetch on demand
	);

	const handleExport = async () => {
		const result = await exportQ.refetch();
		if (!result.data || result.data.length === 0) {
			alert("No transactions in this date range.");
			return;
		}
		const rows = result.data.map((tx) => ({
			Date: tx.date,
			Description: tx.description,
			Amount: (tx.amount / 100).toFixed(2),
			Type: tx.type,
			Category: tx.categoryName ?? "",
			Account: tx.accountName ?? "",
			Notes: tx.notes ?? "",
		}));
		const label = preset === "custom" ? `${dateFrom}_${dateTo}` : preset;
		downloadCsv(rows, `transactions-${label}.csv`);
	};

	const totalExpenses = summary.data?.expenses ?? 0;
	const spendingData =
		spending.data?.map((s, i) => ({
			name: s.categoryName ?? "Uncategorized",
			value: s.total,
			color: s.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
		})) ?? [];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold">Reports</h1>
				<button
					type="button"
					onClick={handleExport}
					disabled={exportQ.isFetching}
					className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
				>
					{exportQ.isFetching ? "Preparing..." : "Export CSV"}
				</button>
			</div>

			{/* Date range selector */}
			<div className="flex flex-wrap items-end gap-3">
				<div className="flex flex-wrap gap-1.5">
					{(Object.keys(PRESET_LABELS) as Preset[])
						.filter((p) => p !== "custom")
						.map((p) => (
							<button
								key={p}
								type="button"
								onClick={() => setPreset(p)}
								className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
									preset === p
										? "bg-primary text-primary-foreground border-primary"
										: "hover:bg-accent"
								}`}
							>
								{PRESET_LABELS[p]}
							</button>
						))}
					<button
						type="button"
						onClick={() => setPreset("custom")}
						className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
							preset === "custom"
								? "bg-primary text-primary-foreground border-primary"
								: "hover:bg-accent"
						}`}
					>
						Custom
					</button>
				</div>

				{preset === "custom" && (
					<div className="flex items-center gap-2">
						<input
							type="date"
							aria-label="From date"
							id="report-date-from"
							value={customFrom}
							onChange={(e) => setCustomFrom(e.target.value)}
							className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
						/>
						<span className="text-muted-foreground" aria-hidden="true">
							to
						</span>
						<label htmlFor="report-date-to" className="sr-only">
							To date
						</label>
						<input
							type="date"
							aria-label="To date"
							id="report-date-to"
							value={customTo}
							onChange={(e) => setCustomTo(e.target.value)}
							className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
						/>
					</div>
				)}
			</div>

			{/* Summary cards */}
			<div className="grid gap-4 md:grid-cols-4">
				<StatCard
					label="Income"
					value={formatCurrency(summary.data?.income ?? 0)}
					valueClass="text-green-600 dark:text-green-400"
					loading={summary.isLoading}
				/>
				<StatCard
					label="Expenses"
					value={formatCurrency(summary.data?.expenses ?? 0)}
					valueClass="text-red-600 dark:text-red-400"
					loading={summary.isLoading}
				/>
				<StatCard
					label="Net"
					value={formatCurrency(summary.data?.net ?? 0)}
					valueClass={
						(summary.data?.net ?? 0) >= 0
							? "text-green-600 dark:text-green-400"
							: "text-red-600 dark:text-red-400"
					}
					loading={summary.isLoading}
				/>
				<StatCard
					label="Transactions"
					value={String(summary.data?.txCount ?? 0)}
					loading={summary.isLoading}
				/>
			</div>

			{/* Charts + spending table */}
			<div className="grid gap-4 lg:grid-cols-2">
				{/* Donut chart */}
				<div className="rounded-lg border bg-card p-5">
					<h2 className="mb-4 text-base font-semibold">Spending by Category</h2>
					{spending.isLoading ? (
						<div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
							Loading...
						</div>
					) : spendingData.length === 0 ? (
						<div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
							No expense data for this period.
						</div>
					) : (
						<ResponsiveContainer width="100%" height={260}>
							<PieChart>
								<Pie
									data={spendingData}
									cx="50%"
									cy="50%"
									innerRadius={55}
									outerRadius={95}
									paddingAngle={2}
									dataKey="value"
								>
									{spendingData.map((entry) => (
										<Cell key={entry.name} fill={entry.color} />
									))}
								</Pie>
								<Tooltip
									formatter={(v: number) => [formatCurrency(v), "Spending"]}
									contentStyle={{
										borderRadius: "8px",
										border: "1px solid hsl(var(--border))",
										background: "hsl(var(--card))",
										color: "hsl(var(--foreground))",
									}}
								/>
								<Legend
									formatter={(value) => (
										<span style={{ color: "hsl(var(--foreground))", fontSize: "12px" }}>
											{value}
										</span>
									)}
								/>
							</PieChart>
						</ResponsiveContainer>
					)}
				</div>

				{/* Category breakdown table */}
				<div className="rounded-lg border bg-card p-5">
					<h2 className="mb-4 text-base font-semibold">Category Breakdown</h2>
					{spending.isLoading ? (
						<p className="text-sm text-muted-foreground">Loading...</p>
					) : spending.data && spending.data.length > 0 ? (
						<div className="space-y-2">
							{spending.data.map((cat, i) => {
								const pct = totalExpenses > 0 ? Math.round((cat.total / totalExpenses) * 100) : 0;
								const color = cat.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
								return (
									<div key={cat.categoryId ?? `uncat-${i}`}>
										<div className="mb-1 flex items-center justify-between text-sm">
											<div className="flex items-center gap-2">
												<span
													className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
													style={{ backgroundColor: color }}
												/>
												<span>{cat.categoryName ?? "Uncategorized"}</span>
												<span className="text-xs text-muted-foreground">({cat.count} tx)</span>
											</div>
											<div className="text-right">
												<span className="font-medium">{formatCurrency(cat.total)}</span>
												<span className="ml-2 text-xs text-muted-foreground">{pct}%</span>
											</div>
										</div>
										<div
											className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
											role="progressbar"
											tabIndex={0}
											aria-valuenow={pct}
											aria-valuemin={0}
											aria-valuemax={100}
											aria-label={`${cat.categoryName ?? "Uncategorized"}: ${pct}% of spending`}
										>
											<div
												className="h-full rounded-full"
												style={{ width: `${pct}%`, backgroundColor: color }}
											/>
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">No expense data for this period.</p>
					)}
				</div>
			</div>

			{/* Monthly breakdown table */}
			{breakdown.data && breakdown.data.length > 1 && (
				<div className="rounded-lg border bg-card">
					<div className="border-b px-5 py-3">
						<h2 className="text-base font-semibold">Monthly Breakdown</h2>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b text-left text-muted-foreground">
									<th scope="col" className="px-5 py-3 font-medium">
										Month
									</th>
									<th
										scope="col"
										className="px-5 py-3 text-right font-medium text-green-600 dark:text-green-400"
									>
										Income
									</th>
									<th
										scope="col"
										className="px-5 py-3 text-right font-medium text-red-600 dark:text-red-400"
									>
										Expenses
									</th>
									<th scope="col" className="px-5 py-3 text-right font-medium">
										Net
									</th>
								</tr>
							</thead>
							<tbody>
								{breakdown.data.map((row) => (
									<tr key={row.key} className="border-b last:border-0 hover:bg-accent/50">
										<td className="px-5 py-3 font-medium">{row.label}</td>
										<td className="px-5 py-3 text-right text-green-600 dark:text-green-400">
											{formatCurrency(row.income)}
										</td>
										<td className="px-5 py-3 text-right text-red-600 dark:text-red-400">
											{formatCurrency(row.expenses)}
										</td>
										<td
											className={`px-5 py-3 text-right font-semibold ${
												row.net >= 0
													? "text-green-600 dark:text-green-400"
													: "text-red-600 dark:text-red-400"
											}`}
										>
											{row.net >= 0 ? "+" : ""}
											{formatCurrency(row.net)}
										</td>
									</tr>
								))}
							</tbody>
							{breakdown.data.length > 1 && (
								<tfoot>
									<tr className="border-t bg-muted/30">
										<td className="px-5 py-3 font-semibold">Total</td>
										<td className="px-5 py-3 text-right font-semibold text-green-600 dark:text-green-400">
											{formatCurrency(summary.data?.income ?? 0)}
										</td>
										<td className="px-5 py-3 text-right font-semibold text-red-600 dark:text-red-400">
											{formatCurrency(summary.data?.expenses ?? 0)}
										</td>
										<td
											className={`px-5 py-3 text-right font-semibold ${
												(summary.data?.net ?? 0) >= 0
													? "text-green-600 dark:text-green-400"
													: "text-red-600 dark:text-red-400"
											}`}
										>
											{(summary.data?.net ?? 0) >= 0 ? "+" : ""}
											{formatCurrency(summary.data?.net ?? 0)}
										</td>
									</tr>
								</tfoot>
							)}
						</table>
					</div>
				</div>
			)}
		</div>
	);
}

function StatCard({
	label,
	value,
	valueClass,
	loading,
}: {
	label: string;
	value: string;
	valueClass?: string;
	loading?: boolean;
}) {
	return (
		<div className="rounded-lg border bg-card p-5">
			<p className="text-sm text-muted-foreground">{label}</p>
			{loading ? (
				<div className="mt-1 h-7 w-20 animate-pulse rounded bg-muted" />
			) : (
				<p className={`mt-0.5 text-xl font-bold ${valueClass ?? ""}`}>{value}</p>
			)}
		</div>
	);
}
