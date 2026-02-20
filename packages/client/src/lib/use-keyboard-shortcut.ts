import { useEffect, useRef } from "react";

export function isTypingTarget(el: Element | null): boolean {
	if (!el) return false;
	const tag = (el as HTMLElement).tagName.toLowerCase();
	return (
		tag === "input" ||
		tag === "textarea" ||
		tag === "select" ||
		(el as HTMLElement).isContentEditable
	);
}

export function useKeyboardShortcut(key: string, handler: () => void): void {
	const handlerRef = useRef(handler);
	handlerRef.current = handler;

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			if (isTypingTarget(document.activeElement)) return;
			if (e.key === key) handlerRef.current();
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [key]);
}
