/** Parse a CSV string into headers + rows of raw string values. */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
	const lines: string[][] = [];
	let field = "";
	let row: string[] = [];
	let inQuotes = false;

	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		const next = text[i + 1];

		if (inQuotes) {
			if (ch === '"' && next === '"') {
				field += '"';
				i++;
			} else if (ch === '"') {
				inQuotes = false;
			} else {
				field += ch;
			}
		} else {
			if (ch === '"') {
				inQuotes = true;
			} else if (ch === ",") {
				row.push(field.trim());
				field = "";
			} else if (ch === "\n" || (ch === "\r" && next === "\n")) {
				if (ch === "\r") i++;
				row.push(field.trim());
				field = "";
				if (row.some((c) => c !== "")) lines.push(row);
				row = [];
			} else if (ch === "\r") {
				row.push(field.trim());
				field = "";
				if (row.some((c) => c !== "")) lines.push(row);
				row = [];
			} else {
				field += ch;
			}
		}
	}

	// Handle final field/row
	if (field || row.length > 0) {
		row.push(field.trim());
		if (row.some((c) => c !== "")) lines.push(row);
	}

	if (lines.length === 0) return { headers: [], rows: [] };

	const headers = lines[0].map((h) => h.replace(/^["']|["']$/g, ""));
	const rows = lines.slice(1);

	return { headers, rows };
}

/** Parse a dollar amount string to cents. Returns NaN if unparseable. */
export function parseCents(raw: string): number {
	// Strip currency symbols, spaces, and thousands separators
	const cleaned = raw.replace(/[$€£¥,\s]/g, "").replace(/\((.+)\)/, "-$1");
	const n = Number.parseFloat(cleaned);
	if (Number.isNaN(n)) return Number.NaN;
	return Math.round(n * 100);
}

export type DateFormat = "YYYY-MM-DD" | "MM/DD/YYYY" | "DD/MM/YYYY" | "M/D/YYYY";

/** Parse a date string to ISO YYYY-MM-DD. Returns null if unparseable. */
export function parseDate(raw: string, format: DateFormat): string | null {
	const s = raw.trim();
	let year: number;
	let month: number;
	let day: number;

	if (format === "YYYY-MM-DD") {
		const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (!m) return null;
		[, year, month, day] = m.map(Number) as [unknown, number, number, number];
	} else if (format === "MM/DD/YYYY") {
		const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
		if (!m) return null;
		[, month, day, year] = m.map(Number) as [unknown, number, number, number];
	} else if (format === "DD/MM/YYYY") {
		const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
		if (!m) return null;
		[, day, month, year] = m.map(Number) as [unknown, number, number, number];
	} else {
		// M/D/YYYY — same regex as MM/DD/YYYY
		const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
		if (!m) return null;
		[, month, day, year] = m.map(Number) as [unknown, number, number, number];
	}

	if (month < 1 || month > 12 || day < 1 || day > 31) return null;
	return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Escape a single CSV field value. */
function escapeCsvField(val: string | number | null | undefined): string {
	const s = val == null ? "" : String(val);
	return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Convert an array of objects to a CSV string and trigger a browser download. */
export function downloadCsv(
	rows: Record<string, string | number | null | undefined>[],
	filename: string,
): void {
	if (rows.length === 0) return;
	const headers = Object.keys(rows[0]);
	const lines = [
		headers.map(escapeCsvField).join(","),
		...rows.map((row) => headers.map((h) => escapeCsvField(row[h])).join(",")),
	];
	const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

export type AmountMode = "sign" | "all-expense" | "all-income";

/** Derive transaction type from amount and mode. */
export function deriveType(
	cents: number,
	mode: AmountMode,
	typeRaw?: string,
): "income" | "expense" | null {
	if (typeRaw !== undefined) {
		const t = typeRaw.trim().toLowerCase();
		if (["income", "credit", "cr", "in", "deposit"].includes(t)) return "income";
		if (["expense", "debit", "dr", "out", "withdrawal", "payment"].includes(t)) return "expense";
		return null;
	}
	if (mode === "all-expense") return "expense";
	if (mode === "all-income") return "income";
	return cents >= 0 ? "income" : "expense";
}
