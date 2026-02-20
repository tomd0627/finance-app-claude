export const defaultCategories = [
	// Expense categories
	{ name: "Groceries", groupName: "Food & Drink", color: "#4CAF50", type: "expense" as const },
	{ name: "Restaurants", groupName: "Food & Drink", color: "#66BB6A", type: "expense" as const },
	{ name: "Coffee", groupName: "Food & Drink", color: "#81C784", type: "expense" as const },
	{ name: "Rent", groupName: "Housing", color: "#2196F3", type: "expense" as const },
	{ name: "Utilities", groupName: "Housing", color: "#42A5F5", type: "expense" as const },
	{ name: "Insurance", groupName: "Housing", color: "#64B5F6", type: "expense" as const },
	{ name: "Gas", groupName: "Transport", color: "#FF9800", type: "expense" as const },
	{ name: "Public Transit", groupName: "Transport", color: "#FFA726", type: "expense" as const },
	{ name: "Car Payment", groupName: "Transport", color: "#FFB74D", type: "expense" as const },
	{ name: "Entertainment", groupName: "Lifestyle", color: "#9C27B0", type: "expense" as const },
	{ name: "Subscriptions", groupName: "Lifestyle", color: "#AB47BC", type: "expense" as const },
	{ name: "Shopping", groupName: "Lifestyle", color: "#CE93D8", type: "expense" as const },
	{ name: "Healthcare", groupName: "Health", color: "#F44336", type: "expense" as const },
	{ name: "Gym", groupName: "Health", color: "#EF5350", type: "expense" as const },
	{ name: "Education", groupName: "Personal", color: "#607D8B", type: "expense" as const },
	{ name: "Gifts", groupName: "Personal", color: "#E91E63", type: "expense" as const },
	{ name: "Other Expense", groupName: null, color: "#9E9E9E", type: "expense" as const },

	// Income categories
	{ name: "Salary", groupName: "Income", color: "#00BCD4", type: "income" as const },
	{ name: "Freelance", groupName: "Income", color: "#26C6DA", type: "income" as const },
	{ name: "Investments", groupName: "Income", color: "#4DD0E1", type: "income" as const },
	{ name: "Other Income", groupName: null, color: "#78909C", type: "income" as const },
] as const;
