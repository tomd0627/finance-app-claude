import { Modal } from "./modal";

interface Props {
	open: boolean;
	onClose: () => void;
}

function Kbd({ children }: { children: React.ReactNode }) {
	return (
		<kbd className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-foreground">
			{children}
		</kbd>
	);
}

const navShortcuts = [
	{ keys: ["g", "d"], label: "Go to Dashboard" },
	{ keys: ["g", "t"], label: "Go to Transactions" },
	{ keys: ["g", "a"], label: "Go to Accounts" },
	{ keys: ["g", "b"], label: "Go to Budgets" },
	{ keys: ["g", "p"], label: "Go to Recurring" },
	{ keys: ["g", "i"], label: "Go to Import" },
	{ keys: ["g", "r"], label: "Go to Reports" },
	{ keys: ["g", "s"], label: "Go to Settings" },
];

const actionShortcuts = [
	{ keys: ["n"], label: "New item (on current page)" },
	{ keys: ["d"], label: "Toggle dark / light mode" },
	{ keys: ["?"], label: "Show this help" },
];

export function KeyboardShortcutsHelp({ open, onClose }: Props) {
	return (
		<Modal open={open} onClose={onClose} title="Keyboard Shortcuts">
			<div className="space-y-6">
				<section>
					<h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
						Navigation
					</h3>
					<ul className="space-y-2">
						{navShortcuts.map((s) => (
							<li key={s.label} className="flex items-center justify-between">
								<span className="text-sm">{s.label}</span>
								<span className="flex items-center gap-1">
									{s.keys.map((k, i) => (
										<span key={k} className="flex items-center gap-1">
											{i > 0 && <span className="text-xs text-muted-foreground">then</span>}
											<Kbd>{k}</Kbd>
										</span>
									))}
								</span>
							</li>
						))}
					</ul>
				</section>

				<section>
					<h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
						Actions
					</h3>
					<ul className="space-y-2">
						{actionShortcuts.map((s) => (
							<li key={s.label} className="flex items-center justify-between">
								<span className="text-sm">{s.label}</span>
								<span className="flex items-center gap-1">
									{s.keys.map((k) => (
										<Kbd key={k}>{k}</Kbd>
									))}
								</span>
							</li>
						))}
					</ul>
				</section>

				<p className="text-xs text-muted-foreground">
					Shortcuts are disabled while typing in forms.
				</p>
			</div>
		</Modal>
	);
}
