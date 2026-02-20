import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "../../lib/utils";

interface SpendingEntry {
	categoryName: string | null;
	color: string | null;
	total: number;
}

interface SpendingChartProps {
	data: SpendingEntry[];
}

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

export function SpendingChart({ data }: SpendingChartProps) {
	if (data.length === 0) {
		return (
			<div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
				No expense data for this period.
			</div>
		);
	}

	const chartData = data.map((entry, i) => ({
		name: entry.categoryName ?? "Uncategorized",
		value: entry.total,
		color: entry.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
	}));

	const topCategories = chartData
		.slice(0, 3)
		.map((d) => `${d.name} ${formatCurrency(d.value)}`)
		.join(", ");

	return (
		<figure
			role="img"
			aria-label={`Spending by category donut chart. Top categories: ${topCategories}`}
		>
			<figcaption className="sr-only">
				Spending by category for this period. Top categories: {topCategories}.
			</figcaption>
			<ResponsiveContainer width="100%" height={280}>
				<PieChart>
					<Pie
						data={chartData}
						cx="50%"
						cy="50%"
						innerRadius={60}
						outerRadius={100}
						paddingAngle={2}
						dataKey="value"
					>
						{chartData.map((entry) => (
							<Cell key={entry.name} fill={entry.color} />
						))}
					</Pie>
					<Tooltip
						formatter={(value: number) => [formatCurrency(value), "Spending"]}
						contentStyle={{
							borderRadius: "8px",
							border: "1px solid hsl(var(--border))",
							background: "hsl(var(--card))",
							color: "hsl(var(--foreground))",
						}}
					/>
					<Legend
						formatter={(value) => (
							<span style={{ color: "hsl(var(--foreground))", fontSize: "12px" }}>{value}</span>
						)}
					/>
				</PieChart>
			</ResponsiveContainer>
		</figure>
	);
}
