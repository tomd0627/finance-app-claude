import { Suspense, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { isTypingTarget } from "../../lib/use-keyboard-shortcut";
import { useTheme } from "../../lib/use-theme";
import { KeyboardShortcutsHelp } from "../ui/keyboard-shortcuts-help";
import { PageLoader } from "../ui/page-loader";
import { Sidebar } from "./sidebar";

const chordRoutes: Record<string, string> = {
	d: "/",
	t: "/transactions",
	a: "/accounts",
	b: "/budgets",
	p: "/recurring",
	i: "/import",
	r: "/reports",
	s: "/settings",
};

function MenuIcon() {
	return (
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
			<line x1="4" x2="20" y1="12" y2="12" />
			<line x1="4" x2="20" y1="6" y2="6" />
			<line x1="4" x2="20" y1="18" y2="18" />
		</svg>
	);
}

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

export function Layout() {
	const [showHelp, setShowHelp] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const navigate = useNavigate();
	const location = useLocation();
	const { toggle: toggleTheme, isDark } = useTheme();
	const chordRef = useRef<string | null>(null);
	const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Close sidebar on route change (mobile nav) — location is an intentional trigger
	// biome-ignore lint/correctness/useExhaustiveDependencies: location used as change trigger
	useEffect(() => {
		setSidebarOpen(false);
	}, [location]);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			if (isTypingTarget(document.activeElement)) return;

			if (chordRef.current === "g") {
				if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
				chordRef.current = null;
				const route = chordRoutes[e.key];
				if (route) navigate(route);
				return;
			}

			if (e.key === "g") {
				chordRef.current = "g";
				chordTimerRef.current = setTimeout(() => {
					chordRef.current = null;
				}, 1000);
				return;
			}

			if (e.key === "d") {
				toggleTheme();
				return;
			}

			if (e.key === "?") {
				setShowHelp(true);
			}
		};

		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
		};
	}, [navigate, toggleTheme]);

	return (
		<div className="flex h-screen">
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
			>
				Skip to main content
			</a>
			<Sidebar
				onShowHelp={() => setShowHelp(true)}
				open={sidebarOpen}
				onClose={() => setSidebarOpen(false)}
			/>
			<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
				{/* Mobile top bar */}
				<header className="flex h-14 flex-none items-center border-b bg-card px-4 md:hidden">
					<button
						type="button"
						onClick={() => setSidebarOpen(true)}
						className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
						aria-label="Open navigation"
						aria-expanded={sidebarOpen}
					>
						<MenuIcon />
					</button>
					<span className="flex-1 text-center text-base font-bold">Finance Tracker</span>
					<button
						type="button"
						onClick={toggleTheme}
						className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
						aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
					>
						{isDark ? <SunIcon /> : <MoonIcon />}
					</button>
				</header>
				<main id="main-content" className="flex-1 overflow-auto p-4 md:p-8">
					<Suspense fallback={<PageLoader />}>
						<Outlet />
					</Suspense>
				</main>
			</div>
			<KeyboardShortcutsHelp open={showHelp} onClose={() => setShowHelp(false)} />
		</div>
	);
}
