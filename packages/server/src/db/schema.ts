import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	type: text("type", { enum: ["checking", "savings", "credit_card", "cash"] }).notNull(),
	createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const categories = sqliteTable("categories", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	groupName: text("group_name"),
	color: text("color"),
	icon: text("icon"),
	type: text("type", { enum: ["income", "expense", "both"] }).notNull(),
	isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
	createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const transactions = sqliteTable("transactions", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	date: text("date").notNull(),
	amount: integer("amount").notNull(),
	type: text("type", { enum: ["income", "expense", "transfer"] }).notNull(),
	description: text("description").notNull(),
	notes: text("notes"),
	categoryId: integer("category_id").references(() => categories.id),
	accountId: integer("account_id")
		.notNull()
		.references(() => accounts.id),
	transferToAccountId: integer("transfer_to_account_id").references(() => accounts.id),
	recurringId: integer("recurring_id").references(() => recurringTransactions.id),
	createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
	updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const tags = sqliteTable("tags", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull().unique(),
});

export const transactionTags = sqliteTable(
	"transaction_tags",
	{
		transactionId: integer("transaction_id")
			.notNull()
			.references(() => transactions.id, { onDelete: "cascade" }),
		tagId: integer("tag_id")
			.notNull()
			.references(() => tags.id, { onDelete: "cascade" }),
	},
	(table) => [primaryKey({ columns: [table.transactionId, table.tagId] })],
);

export const budgets = sqliteTable("budgets", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	categoryId: integer("category_id")
		.notNull()
		.references(() => categories.id),
	year: integer("year").notNull(),
	month: integer("month").notNull(),
	amount: integer("amount").notNull(),
	rollover: integer("rollover", { mode: "boolean" }).notNull().default(false),
});

export const recurringTransactions = sqliteTable("recurring_transactions", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	description: text("description").notNull(),
	amount: integer("amount").notNull(),
	type: text("type", { enum: ["income", "expense"] }).notNull(),
	categoryId: integer("category_id").references(() => categories.id),
	accountId: integer("account_id")
		.notNull()
		.references(() => accounts.id),
	frequency: text("frequency", {
		enum: ["daily", "weekly", "biweekly", "monthly", "yearly"],
	}).notNull(),
	startDate: text("start_date").notNull(),
	endDate: text("end_date"),
	isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
	lastGenerated: text("last_generated"),
	createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const csvTemplates = sqliteTable("csv_templates", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	columnMapping: text("column_mapping").notNull(), // JSON string
	dateFormat: text("date_format").notNull(),
	createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});
