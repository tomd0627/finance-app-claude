import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
		},
	},
	server: {
		port: 5173,
		proxy: {
			"/trpc": {
				target: "http://localhost:3001",
				changeOrigin: true,
			},
		},
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					"vendor-react": ["react", "react-dom"],
					"vendor-router": ["react-router-dom"],
					"vendor-query": ["@tanstack/react-query"],
					"vendor-trpc": ["@trpc/client", "@trpc/react-query"],
					"vendor-charts": ["recharts"],
					"vendor-forms": ["react-hook-form", "@hookform/resolvers"],
				},
			},
		},
	},
});
