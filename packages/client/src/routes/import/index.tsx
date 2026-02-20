import { useRef, useState } from "react";
import {
	type AmountMode,
	type DateFormat,
	deriveType,
	parseCents,
	parseCsv,
	parseDate,
} from "../../lib/csv";
import { trpc } from "../../lib/trpc";
import { formatCurrency } from "../../lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CsvData {
	headers: string[];
	rows: string[][];
}

interface ColumnMap {
	date: string;
	description: string;
	amount: string;
	type: string; // column name or "" if using amountMode
	notes: string;
	category: string;
}

interface ParsedRow {
	date: string | null;
	description: string;
	amount: number; // cents, absolute value
	type: "income" | "expense" | null;
	notes: string;
	categoryName: string;
	valid: boolean;
	errors: string[];
	raw: string[];
}

// ─── Main component ────────────────────────────────────────────────────────────

export function Import() {
	const [step, setStep] = useState<1 | 2 | 3>(1);
	const [csv, setCsv] = useState<CsvData | null>(null);
	const [fileName, setFileName] = useState("");
	const [isDragging, setIsDragging] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);

	// Step 2 — mapping config
	const [colMap, setColMap] = useState<ColumnMap>({
		date: "",
		description: "",
		amount: "",
		type: "",
		notes: "",
		category: "",
	});
	const [dateFormat, setDateFormat] = useState<DateFormat>("MM/DD/YYYY");
	const [amountMode, setAmountMode] = useState<AmountMode>("sign");
	const [defaultAccountId, setDefaultAccountId] = useState<number>(0);

	// Step 3 — import result
	const [importResult, setImportResult] = useState<{ imported: number } | null>(null);

	const accounts = trpc.account.list.useQuery();
	const categories = trpc.category.list.useQuery();
	const utils = trpc.useUtils();

	const importMutation = trpc.transaction.importBulk.useMutation({
		onSuccess: (result) => {
			setImportResult(result);
			utils.transaction.invalidate();
			utils.dashboard.invalidate();
		},
	});

	// ── Step 1: file handling ──────────────────────────────────────────────────

	const handleFile = (file: File) => {
		if (!file.name.endsWith(".csv")) {
			alert("Please select a .csv file.");
			return;
		}
		setFileName(file.name);
		const reader = new FileReader();
		reader.onload = (e) => {
			const text = e.target?.result as string;
			const parsed = parseCsv(text);
			if (parsed.headers.length === 0) {
				alert("Could not parse the CSV file. Make sure it has a header row.");
				return;
			}
			setCsv(parsed);
			// Auto-detect common column names
			const h = parsed.headers;
			const find = (candidates: string[]) =>
				h.find((col) => candidates.some((c) => col.toLowerCase().includes(c))) ?? "";
			setColMap({
				date: find(["date"]),
				description: find(["description", "memo", "payee", "merchant", "name"]),
				amount: find(["amount", "debit", "value"]),
				type: find(["type", "transaction type", "category type"]),
				notes: find(["note", "comment", "remark"]),
				category: find(["category", "label"]),
			});
		};
		reader.readAsText(file);
	};

	const onDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		const file = e.dataTransfer.files[0];
		if (file) handleFile(file);
	};

	// ── Step 2 → 3: parse rows ────────────────────────────────────────────────

	const parsedRows: ParsedRow[] = csv
		? csv.rows.map((row) => {
				const get = (col: string) => {
					const idx = csv.headers.indexOf(col);
					return idx >= 0 ? (row[idx] ?? "") : "";
				};

				const errors: string[] = [];

				const dateRaw = get(colMap.date);
				const date = dateRaw ? parseDate(dateRaw, dateFormat) : null;
				if (!date) errors.push("Invalid date");

				const amountRaw = get(colMap.amount);
				const rawCents = parseCents(amountRaw);
				if (Number.isNaN(rawCents)) errors.push("Invalid amount");
				const amount = Math.abs(rawCents);

				const typeRaw = colMap.type ? get(colMap.type) : undefined;
				const type = Number.isNaN(rawCents)
					? null
					: deriveType(rawCents, amountMode, typeRaw !== undefined ? typeRaw : undefined);
				if (!type) errors.push("Could not determine type");

				const description = get(colMap.description) || "(no description)";

				return {
					date,
					description,
					amount,
					type,
					notes: get(colMap.notes),
					categoryName: get(colMap.category),
					valid: errors.length === 0,
					errors,
					raw: row,
				};
			})
		: [];

	const validRows = parsedRows.filter((r) => r.valid);
	const invalidRows = parsedRows.filter((r) => !r.valid);

	// ── Import ────────────────────────────────────────────────────────────────

	const handleImport = () => {
		if (defaultAccountId === 0) {
			alert("Please select a default account.");
			return;
		}

		const categoryMap = new Map(categories.data?.map((c) => [c.name.toLowerCase(), c.id]) ?? []);

		const payload = validRows.map((row) => ({
			date: row.date as string,
			description: row.description,
			amount: row.amount,
			type: row.type as "income" | "expense",
			notes: row.notes || null,
			accountId: defaultAccountId,
			categoryId: row.categoryName
				? (categoryMap.get(row.categoryName.toLowerCase()) ?? null)
				: null,
			transferToAccountId: null,
		}));

		importMutation.mutate(payload);
	};

	// ── Reset ─────────────────────────────────────────────────────────────────

	const reset = () => {
		setStep(1);
		setCsv(null);
		setFileName("");
		setImportResult(null);
		setDefaultAccountId(0);
	};

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<div className="space-y-6">
			<h1 className="text-3xl font-bold">Import Transactions</h1>

			{/* Step indicators */}
			<div className="flex items-center gap-2">
				{(["Upload", "Map Columns", "Preview & Import"] as const).map((label, i) => {
					const stepNum = (i + 1) as 1 | 2 | 3;
					const active = step === stepNum;
					const done = step > stepNum;
					return (
						<div key={label} className="flex items-center gap-2">
							<div
								className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
									done
										? "bg-primary text-primary-foreground"
										: active
											? "border-2 border-primary text-primary"
											: "border-2 border-muted-foreground/30 text-muted-foreground"
								}`}
							>
								{done ? "✓" : stepNum}
							</div>
							<span
								aria-current={active ? "step" : undefined}
								className={`text-sm ${active ? "font-medium" : "text-muted-foreground"}`}
							>
								{label}
							</span>
							{i < 2 && <span className="text-muted-foreground/40">──</span>}
						</div>
					);
				})}
			</div>

			{/* ── Step 1: Upload ───────────────────────────────────────────────────── */}
			{step === 1 && (
				<div className="space-y-4">
					<label
						className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
							isDragging
								? "border-primary bg-primary/5"
								: "border-muted-foreground/25 hover:border-primary/50"
						}`}
						onDragOver={(e) => {
							e.preventDefault();
							setIsDragging(true);
						}}
						onDragLeave={() => setIsDragging(false)}
						onDrop={onDrop}
					>
						<div className="text-4xl">📄</div>
						<p className="mt-3 text-sm font-medium">
							Drag & drop a CSV file here, or click to browse
						</p>
						<p className="mt-1 text-xs text-muted-foreground">
							Supports exports from most banking apps
						</p>
						<input
							ref={fileRef}
							type="file"
							accept=".csv"
							className="hidden"
							onChange={(e) => {
								const file = e.target.files?.[0];
								if (file) handleFile(file);
							}}
						/>
					</label>

					{csv && (
						<div className="rounded-lg border bg-card p-4">
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium">{fileName}</p>
									<p className="text-sm text-muted-foreground">
										{csv.rows.length} rows · {csv.headers.length} columns
									</p>
								</div>
								<button
									type="button"
									onClick={() => setStep(2)}
									className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
								>
									Next: Map Columns →
								</button>
							</div>
							<div className="mt-3 flex flex-wrap gap-1.5">
								{csv.headers.map((h) => (
									<span
										key={h}
										className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
									>
										{h}
									</span>
								))}
							</div>
						</div>
					)}
				</div>
			)}

			{/* ── Step 2: Map Columns ──────────────────────────────────────────────── */}
			{step === 2 && csv && (
				<div className="space-y-5">
					<div className="rounded-lg border bg-card p-5">
						<h2 className="mb-4 text-base font-semibold">Column Mapping</h2>

						<div className="grid gap-4 md:grid-cols-2">
							<ColSelect
								label="Date column *"
								value={colMap.date}
								headers={csv.headers}
								onChange={(v) => setColMap({ ...colMap, date: v })}
							/>
							<div>
								<label htmlFor="date-format" className="mb-1 block text-sm font-medium">
									Date format *
								</label>
								<select
									id="date-format"
									value={dateFormat}
									onChange={(e) => setDateFormat(e.target.value as DateFormat)}
									className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
								>
									<option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
									<option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
									<option value="DD/MM/YYYY">DD/MM/YYYY (EU)</option>
									<option value="M/D/YYYY">M/D/YYYY (US short)</option>
								</select>
							</div>

							<ColSelect
								label="Description column *"
								value={colMap.description}
								headers={csv.headers}
								onChange={(v) => setColMap({ ...colMap, description: v })}
							/>
							<ColSelect
								label="Amount column *"
								value={colMap.amount}
								headers={csv.headers}
								onChange={(v) => setColMap({ ...colMap, amount: v })}
							/>

							<div>
								<label htmlFor="tx-type-col" className="mb-1 block text-sm font-medium">
									Transaction type
								</label>
								<select
									id="tx-type-col"
									value={colMap.type}
									onChange={(e) => setColMap({ ...colMap, type: e.target.value })}
									className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
								>
									<option value="">Use amount sign (– = expense)</option>
									<option value="__all_expense">Treat all as expense</option>
									<option value="__all_income">Treat all as income</option>
									{csv.headers.map((h) => (
										<option key={h} value={h}>
											Column: {h}
										</option>
									))}
								</select>
							</div>

							<ColSelect
								label="Category column"
								value={colMap.category}
								headers={csv.headers}
								optional
								onChange={(v) => setColMap({ ...colMap, category: v })}
							/>

							<ColSelect
								label="Notes column"
								value={colMap.notes}
								headers={csv.headers}
								optional
								onChange={(v) => setColMap({ ...colMap, notes: v })}
							/>

							<div>
								<label htmlFor="default-account" className="mb-1 block text-sm font-medium">
									Default account *
								</label>
								<select
									id="default-account"
									value={defaultAccountId}
									onChange={(e) => setDefaultAccountId(Number(e.target.value))}
									className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
								>
									<option value={0}>Select account...</option>
									{accounts.data?.map((a) => (
										<option key={a.id} value={a.id}>
											{a.name}
										</option>
									))}
								</select>
							</div>
						</div>
					</div>

					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => setStep(1)}
							className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
						>
							← Back
						</button>
						<button
							type="button"
							disabled={
								!colMap.date || !colMap.description || !colMap.amount || defaultAccountId === 0
							}
							onClick={() => {
								// Resolve type column vs mode
								if (colMap.type === "__all_expense") {
									setAmountMode("all-expense");
									setColMap({ ...colMap, type: "" });
								} else if (colMap.type === "__all_income") {
									setAmountMode("all-income");
									setColMap({ ...colMap, type: "" });
								} else if (!colMap.type) {
									setAmountMode("sign");
								}
								setStep(3);
							}}
							className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
						>
							Next: Preview →
						</button>
					</div>
				</div>
			)}

			{/* ── Step 3: Preview & Import ─────────────────────────────────────────── */}
			{step === 3 && (
				<div className="space-y-5">
					{/* Summary bar */}
					<div className="flex gap-3">
						<div className="rounded-lg border bg-card px-4 py-3 text-sm">
							<span className="font-semibold text-green-600">{validRows.length}</span>{" "}
							<span className="text-muted-foreground">ready to import</span>
						</div>
						{invalidRows.length > 0 && (
							<div className="rounded-lg border bg-card px-4 py-3 text-sm">
								<span className="font-semibold text-destructive">{invalidRows.length}</span>{" "}
								<span className="text-muted-foreground">will be skipped</span>
							</div>
						)}
					</div>

					{/* Import result */}
					{importResult && (
						<div className="rounded-lg border border-green-200 bg-green-50 p-4">
							<p className="font-medium text-green-800">
								Successfully imported {importResult.imported} transaction
								{importResult.imported !== 1 ? "s" : ""}!
							</p>
							<button
								type="button"
								onClick={reset}
								className="mt-2 text-sm text-green-700 hover:underline"
							>
								Import another file
							</button>
						</div>
					)}

					{/* Preview table */}
					{!importResult && (
						<>
							<div className="rounded-lg border bg-card">
								<div className="border-b px-4 py-2.5">
									<p className="text-sm font-medium text-muted-foreground">
										Preview (first 20 rows shown)
									</p>
								</div>
								<div className="overflow-x-auto">
									<table className="w-full text-sm">
										<caption className="sr-only">Import preview — first 20 rows</caption>
										<thead>
											<tr className="border-b text-left text-muted-foreground">
												<th scope="col" className="px-3 py-2 font-medium">
													Date
												</th>
												<th scope="col" className="px-3 py-2 font-medium">
													Description
												</th>
												<th scope="col" className="px-3 py-2 font-medium">
													Type
												</th>
												<th scope="col" className="px-3 py-2 text-right font-medium">
													Amount
												</th>
												{colMap.category && (
													<th scope="col" className="px-3 py-2 font-medium">
														Category
													</th>
												)}
												<th scope="col" className="px-3 py-2 font-medium">
													Status
												</th>
											</tr>
										</thead>
										<tbody>
											{parsedRows.slice(0, 20).map((row, i) => (
												<tr
													key={`${row.date ?? "nodate"}-${row.description.slice(0, 20)}-${i}`}
													className={`border-b last:border-0 ${!row.valid ? "bg-red-50/50" : ""}`}
												>
													<td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
														{row.date ?? (
															<span className="text-destructive">
																{row.raw[csv?.headers.indexOf(colMap.date) ?? 0]}
															</span>
														)}
													</td>
													<td className="px-3 py-2 max-w-[200px] truncate">{row.description}</td>
													<td className="px-3 py-2">
														{row.type ? (
															<span
																className={`rounded-full px-2 py-0.5 text-xs font-medium ${
																	row.type === "income"
																		? "bg-green-100 text-green-700"
																		: "bg-red-100 text-red-700"
																}`}
															>
																{row.type}
															</span>
														) : (
															<span className="text-xs text-destructive">unknown</span>
														)}
													</td>
													<td className="px-3 py-2 text-right whitespace-nowrap">
														{Number.isNaN(row.amount) ? (
															<span className="text-destructive">—</span>
														) : (
															formatCurrency(row.amount)
														)}
													</td>
													{colMap.category && (
														<td className="px-3 py-2 text-muted-foreground">
															{row.categoryName || "—"}
														</td>
													)}
													<td className="px-3 py-2">
														{row.valid ? (
															<span className="text-xs text-green-600">✓ ok</span>
														) : (
															<span
																className="text-xs text-destructive"
																title={row.errors.join(", ")}
															>
																⚠ {row.errors.join(", ")}
															</span>
														)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
								{parsedRows.length > 20 && (
									<div className="border-t px-4 py-2 text-center text-xs text-muted-foreground">
										…and {parsedRows.length - 20} more rows
									</div>
								)}
							</div>

							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => setStep(2)}
									className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
								>
									← Back
								</button>
								<button
									type="button"
									disabled={validRows.length === 0 || importMutation.isPending}
									onClick={handleImport}
									className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
								>
									{importMutation.isPending
										? "Importing..."
										: `Import ${validRows.length} Transaction${validRows.length !== 1 ? "s" : ""}`}
								</button>
							</div>

							{importMutation.error && (
								<p className="text-sm text-destructive">{importMutation.error.message}</p>
							)}
						</>
					)}
				</div>
			)}
		</div>
	);
}

// ─── Helper component ──────────────────────────────────────────────────────────

function ColSelect({
	label,
	value,
	headers,
	optional,
	onChange,
}: {
	label: string;
	value: string;
	headers: string[];
	optional?: boolean;
	onChange: (v: string) => void;
}) {
	const id = `col-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
	return (
		<div>
			<label htmlFor={id} className="mb-1 block text-sm font-medium">
				{label}
			</label>
			<select
				id={id}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
			>
				<option value="">{optional ? "— not mapped —" : "Select column..."}</option>
				{headers.map((h) => (
					<option key={h} value={h}>
						{h}
					</option>
				))}
			</select>
		</div>
	);
}
