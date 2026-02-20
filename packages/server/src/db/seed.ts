import { defaultCategories } from "shared";
import { db } from "./index.js";
import { accounts, categories } from "./schema.js";

async function seed() {
	console.log("Seeding database...");

	// Insert default accounts
	const existingAccounts = await db.select().from(accounts);
	if (existingAccounts.length === 0) {
		await db.insert(accounts).values([
			{ name: "Cash", type: "cash" },
			{ name: "Checking", type: "checking" },
		]);
		console.log("Created default accounts");
	}

	// Insert default categories
	const existingCategories = await db.select().from(categories);
	if (existingCategories.length === 0) {
		await db.insert(categories).values(
			defaultCategories.map((c) => ({
				name: c.name,
				groupName: c.groupName,
				color: c.color,
				type: c.type,
				isDefault: true,
			})),
		);
		console.log("Created default categories");
	}

	console.log("Seed complete!");
}

seed();
