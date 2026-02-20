import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cors from "cors";
import express from "express";
import { appRouter } from "./trpc/appRouter.js";

// Import db to initialize it (creates file + runs pragmas)
import "./db/index.js";

const app = express();
const PORT = 3001;

app.use(cors({ origin: "http://localhost:5173" }));

app.use(
	"/trpc",
	createExpressMiddleware({
		router: appRouter,
	}),
);

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
