import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { type CreateCategoryInput, categoryTypes, createCategorySchema } from "shared";
import { Autocomplete } from "../../components/ui/autocomplete";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { EmptyState } from "../../components/ui/empty-state";
import { Modal } from "../../components/ui/modal";
import { trpc } from "../../lib/trpc";
import { useKeyboardShortcut } from "../../lib/use-keyboard-shortcut";

const categoryTypeLabels: Record<string, string> = {
	income: "Income",
	expense: "Expense",
	both: "Both",
};

export function Settings() {
	const [formOpen, setFormOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [deletingId, setDeletingId] = useState<number | null>(null);

	const utils = trpc.useUtils();
	const categories = trpc.category.list.useQuery();

	const form = useForm<CreateCategoryInput>({
		resolver: zodResolver(createCategorySchema),
		defaultValues: { name: "", type: "expense", groupName: "", color: "#6b7280", icon: "" },
	});

	const createMutation = trpc.category.create.useMutation({
		onSuccess: () => {
			utils.category.invalidate();
			closeForm();
		},
	});

	const updateMutation = trpc.category.update.useMutation({
		onSuccess: () => {
			utils.category.invalidate();
			closeForm();
		},
	});

	const deleteMutation = trpc.category.delete.useMutation({
		onSuccess: () => {
			utils.category.invalidate();
			setDeletingId(null);
		},
	});

	const closeForm = () => {
		setFormOpen(false);
		setEditingId(null);
		form.reset({ name: "", type: "expense", groupName: "", color: "#6b7280", icon: "" });
	};

	const openCreate = () => {
		form.reset({ name: "", type: "expense", groupName: "", color: "#6b7280", icon: "" });
		setEditingId(null);
		setFormOpen(true);
	};

	useKeyboardShortcut("n", openCreate);

	const openEdit = (cat: {
		id: number;
		name: string;
		type: string;
		groupName: string | null;
		color: string | null;
		icon: string | null;
	}) => {
		form.reset({
			name: cat.name,
			type: cat.type as CreateCategoryInput["type"],
			groupName: cat.groupName ?? "",
			color: cat.color ?? "#6b7280",
			icon: cat.icon ?? "",
		});
		setEditingId(cat.id);
		setFormOpen(true);
	};

	const onSubmit = (values: CreateCategoryInput) => {
		const data = {
			...values,
			groupName: values.groupName || null,
			icon: values.icon || null,
		};
		if (editingId) {
			updateMutation.mutate({ id: editingId, data });
		} else {
			createMutation.mutate(data);
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	// Derive distinct group names for autocomplete
	const groupSuggestions = useMemo(() => {
		const seen = new Set<string>();
		for (const cat of categories.data ?? []) {
			if (cat.groupName) seen.add(cat.groupName);
		}
		return Array.from(seen).sort();
	}, [categories.data]);

	// Group categories by groupName
	const grouped = new Map<string, typeof categories.data>();
	for (const cat of categories.data ?? []) {
		const group = cat.groupName ?? "Other";
		if (!grouped.has(group)) grouped.set(group, []);
		grouped.get(group)?.push(cat);
	}

	return (
		<div className="space-y-6">
			<h1 className="text-3xl font-bold">Settings</h1>

			{/* Category Management */}
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="text-xl font-semibold">Categories</h2>
					<button
						type="button"
						onClick={openCreate}
						className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
					>
						+ Add Category
					</button>
				</div>

				{Array.from(grouped.entries()).map(([group, cats]) => (
					<div key={group} className="rounded-lg border bg-card">
						<div className="border-b px-4 py-2">
							<h3 className="text-sm font-semibold text-muted-foreground">{group}</h3>
						</div>
						<div className="divide-y">
							{cats?.map((cat) => (
								<div key={cat.id} className="flex items-center justify-between px-4 py-3">
									<div className="flex items-center gap-3">
										{cat.color && (
											<span
												className="inline-block h-3 w-3 rounded-full"
												style={{ backgroundColor: cat.color }}
											/>
										)}
										<span className="font-medium">{cat.name}</span>
										<span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
											{categoryTypeLabels[cat.type] ?? cat.type}
										</span>
									</div>
									<div className="flex gap-1">
										<button
											type="button"
											onClick={() => openEdit(cat)}
											className="rounded px-2 py-1 text-xs hover:bg-accent"
										>
											Edit
										</button>
										{!cat.isDefault && (
											<button
												type="button"
												onClick={() => setDeletingId(cat.id)}
												className="rounded px-2 py-1 text-xs text-destructive hover:bg-red-50"
											>
												Delete
											</button>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				))}

				{categories.data && categories.data.length === 0 && (
					<EmptyState
						icon="🏷️"
						title="No categories yet"
						description="Add categories to organize your transactions."
						action={{ label: "+ Add Category", onClick: openCreate }}
					/>
				)}
			</div>

			{/* Category Form Modal */}
			<Modal
				open={formOpen}
				onClose={closeForm}
				title={editingId ? "Edit Category" : "Add Category"}
			>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<div>
						<label htmlFor="cat-name" className="mb-1 block text-sm font-medium">
							Name
						</label>
						<input
							id="cat-name"
							type="text"
							placeholder="e.g., Groceries"
							{...form.register("name")}
							className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
						/>
						{form.formState.errors.name && (
							<p className="mt-1 text-xs text-destructive">{form.formState.errors.name.message}</p>
						)}
					</div>

					<div>
						<label htmlFor="cat-type" className="mb-1 block text-sm font-medium">
							Type
						</label>
						<select
							id="cat-type"
							{...form.register("type")}
							className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
						>
							{categoryTypes.map((t) => (
								<option key={t} value={t}>
									{categoryTypeLabels[t] ?? t}
								</option>
							))}
						</select>
					</div>

					<div>
						<label htmlFor="cat-group" className="mb-1 block text-sm font-medium">
							Group
						</label>
						<Controller
							control={form.control}
							name="groupName"
							render={({ field }) => (
								<Autocomplete
									id="cat-group"
									value={field.value ?? ""}
									onChange={field.onChange}
									onBlur={field.onBlur}
									name={field.name}
									suggestions={groupSuggestions}
									placeholder="e.g., Food & Drink"
									className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
								/>
							)}
						/>
					</div>

					<div>
						<label htmlFor="cat-color-hex" className="mb-1 block text-sm font-medium">
							Color
						</label>
						<div className="flex items-center gap-2">
							<input
								id="cat-color-picker"
								aria-label="Color picker"
								type="color"
								{...form.register("color")}
								className="h-9 w-12 cursor-pointer rounded border p-0.5"
							/>
							<input
								type="text"
								{...form.register("color")}
								className="w-28 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
								id="cat-color-hex"
								aria-label="Color hex value"
							/>
						</div>
					</div>

					{(createMutation.error || updateMutation.error) && (
						<p className="text-sm text-destructive">
							{createMutation.error?.message || updateMutation.error?.message}
						</p>
					)}

					<div className="flex justify-end gap-2 pt-2">
						<button
							type="button"
							onClick={closeForm}
							className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isPending}
							className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
						>
							{isPending ? "Saving..." : editingId ? "Update" : "Add Category"}
						</button>
					</div>
				</form>
			</Modal>

			<ConfirmDialog
				open={deletingId !== null}
				onClose={() => setDeletingId(null)}
				title="Delete Category"
				description="Are you sure? Transactions using this category will become uncategorized."
				isPending={deleteMutation.isPending}
				onConfirm={() => deletingId !== null && deleteMutation.mutate({ id: deletingId })}
			/>
		</div>
	);
}
