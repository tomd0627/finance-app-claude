import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/layout";
import { trpc, trpcClient } from "./lib/trpc";
import { useTheme } from "./lib/use-theme";

const Dashboard = lazy(() => import("./routes/index").then((m) => ({ default: m.Dashboard })));
const Transactions = lazy(() =>
	import("./routes/transactions/index").then((m) => ({ default: m.Transactions })),
);
const Budgets = lazy(() => import("./routes/budgets/index").then((m) => ({ default: m.Budgets })));
const Accounts = lazy(() =>
	import("./routes/accounts/index").then((m) => ({ default: m.Accounts })),
);
const Import = lazy(() => import("./routes/import/index").then((m) => ({ default: m.Import })));
const Reports = lazy(() => import("./routes/reports/index").then((m) => ({ default: m.Reports })));
const Settings = lazy(() =>
	import("./routes/settings/index").then((m) => ({ default: m.Settings })),
);
const Recurring = lazy(() =>
	import("./routes/recurring/index").then((m) => ({ default: m.Recurring })),
);

export function App() {
	useTheme();

	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 5 * 60 * 1000,
						refetchOnWindowFocus: false,
					},
				},
			}),
	);

	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>
				<BrowserRouter>
					<Routes>
						<Route element={<Layout />}>
							<Route index element={<Dashboard />} />
							<Route path="transactions" element={<Transactions />} />
							<Route path="budgets" element={<Budgets />} />
							<Route path="accounts" element={<Accounts />} />
							<Route path="import" element={<Import />} />
							<Route path="reports" element={<Reports />} />
							<Route path="recurring" element={<Recurring />} />
							<Route path="settings" element={<Settings />} />
						</Route>
					</Routes>
				</BrowserRouter>
			</QueryClientProvider>
		</trpc.Provider>
	);
}
