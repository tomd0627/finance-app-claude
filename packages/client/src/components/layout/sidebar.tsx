import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../../lib/use-theme";

const navItems = [
	{ to: "/", label: "Dashboard", icon: "📊" },
	{ to: "/transactions", label: "Transactions", icon: "💳" },
	{ to: "/budgets", label: "Budgets", icon: "🎯" },
	{ to: "/accounts", label: "Accounts", icon: "🏦" },
	{ to: "/recurring", label: "Recurring", icon: "🔁" },
	{ to: "/import", label: "Import", icon: "📥" },
	{ to: "/reports", label: "Reports", icon: "📈" },
	{ to: "/settings", label: "Settings", icon: "⚙️" },
] as const;

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function SunIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="4" />
			<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
		</svg>
	);
}

function MoonIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
		</svg>
	);
}

interface SidebarProps {
	onShowHelp: () => void;
	open: boolean;
	onClose: () => void;
}

export function Sidebar({ onShowHelp, open, onClose }: SidebarProps) {
	const { pathname: currentPath } = useLocation();
	const { isDark, toggle } = useTheme();
	const asideRef = useRef<HTMLElement>(null);

	// Focus trap + Escape handler for mobile drawer
	useEffect(() => {
		if (!open) return;
		// Move focus into the sidebar when it opens
		requestAnimationFrame(() => {
			const first = asideRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)[0];
			first?.focus();
		});
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
				return;
			}
			if (e.key !== "Tab") return;
			const aside = asideRef.current;
			if (!aside) return;
			const focusable = Array.from(aside.querySelectorAll<HTMLElement>(FOCUSABLE));
			if (focusable.length === 0) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (e.shiftKey) {
				if (document.activeElement === first) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [open, onClose]);

	return (
		<>
			{/* Mobile backdrop — only fires close on Escape (click handled by onClick) */}
			<div
				className={`fixed inset-0 z-30 bg-black/50 transition-opacity duration-200 md:hidden ${
					open ? "opacity-100" : "pointer-events-none opacity-0"
				}`}
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === "Escape") onClose();
				}}
				aria-hidden="true"
			/>

			<aside
				ref={asideRef}
				className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col border-r bg-card transition-transform duration-200 md:relative md:translate-x-0 md:transition-none ${
					open ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				<div className="flex items-center justify-between border-b p-4 md:p-6">
					<h1 className="text-xl font-bold">Finance Tracker</h1>
					<button
						type="button"
						onClick={onClose}
						className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
						aria-label="Close navigation"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<path d="M18 6 6 18M6 6l12 12" />
						</svg>
					</button>
				</div>
				<nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Main navigation">
					{navItems.map((item) => {
						const isActive =
							item.to === "/" ? currentPath === "/" : currentPath.startsWith(item.to);
						return (
							<Link
								key={item.to}
								to={item.to}
								aria-current={isActive ? "page" : undefined}
								className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
									isActive
										? "bg-primary text-primary-foreground"
										: "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
								}`}
							>
								<span aria-hidden="true">{item.icon}</span>
								{item.label}
							</Link>
						);
					})}
				</nav>
				<div className="space-y-1 border-t p-4">
					<button
						type="button"
						onClick={toggle}
						className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
					>
						{isDark ? <SunIcon /> : <MoonIcon />}
						{isDark ? "Light mode" : "Dark mode"}
					</button>
					<button
						type="button"
						onClick={onShowHelp}
						title="Keyboard shortcuts (?)"
						className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
					>
						<span className="text-base leading-none" aria-hidden="true">
							⌨
						</span>
						Keyboard shortcuts
					</button>
				</div>
			</aside>
		</>
	);
}
