import { router } from "./index.js";
import { accountRouter } from "./routers/account.js";
import { budgetRouter } from "./routers/budget.js";
import { categoryRouter } from "./routers/category.js";
import { dashboardRouter } from "./routers/dashboard.js";
import { recurringRouter } from "./routers/recurring.js";
import { reportRouter } from "./routers/report.js";
import { transactionRouter } from "./routers/transaction.js";

export const appRouter = router({
	transaction: transactionRouter,
	category: categoryRouter,
	account: accountRouter,
	budget: budgetRouter,
	dashboard: dashboardRouter,
	report: reportRouter,
	recurring: recurringRouter,
});

export type AppRouter = typeof appRouter;
