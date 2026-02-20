import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { useTheme } from "../../lib/use-theme";
import { formatCurrency } from "../../lib/utils";

interface TrendEntry {
	month: string;
	income: number;
	expenses: number;
}

interface TrendChartProps {
	data: TrendEntry[];
}

export function TrendChart({ data }: TrendChartProps) {
	const { isDark } = useTheme();

	if (data.every((d) => d.income === 0 && d.expenses === 0)) {
		return (
			<div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
				No data for the last 6 months.
			</div>
		);
	}

	const tickFormatter = (value: number) => {
		if (value === 0) return "$0";
		if (Math.abs(value) >= 100000) return `$${(value / 100000).toFixed(0)}k`;
		return `$${(value / 100).toFixed(0)}`;
	};

	const months = data.map((d) => d.month).join(", ");

	return (
		<figure
			role="img"
			aria-label={`Monthly income and expenses bar chart for the past 6 months (${months})`}
		>
			<figcaption className="sr-only">
				Bar chart comparing monthly income and expenses over the past 6 months: {months}.
			</figcaption>
			<ResponsiveContainer width="100%" height={280}>
				<BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
					<XAxis
						dataKey="month"
						tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
						axisLine={false}
						tickLine={false}
					/>
					<YAxis
						tickFormatter={tickFormatter}
						tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
						axisLine={false}
						tickLine={false}
						width={48}
					/>
					<Tooltip
						formatter={(value: number, name: string) => [
							formatCurrency(value),
							name === "income" ? "Income" : "Expenses",
						]}
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
								{value === "income" ? "Income" : "Expenses"}
							</span>
						)}
					/>
					<Bar dataKey="income" fill={isDark ? "#4ade80" : "#22c55e"} radius={[3, 3, 0, 0]} />
					<Bar dataKey="expenses" fill={isDark ? "#f87171" : "#ef4444"} radius={[3, 3, 0, 0]} />
				</BarChart>
			</ResponsiveContainer>
		</figure>
	);
}
