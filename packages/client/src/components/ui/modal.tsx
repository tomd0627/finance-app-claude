import { useEffect, useRef } from "react";

interface ModalProps {
	open: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
}

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, children }: ModalProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const triggerRef = useRef<Element | null>(null);

	// Capture the element that opened the modal so focus can be restored on close
	useEffect(() => {
		if (open) {
			triggerRef.current = document.activeElement;
			requestAnimationFrame(() => {
				const first = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)[0];
				first?.focus();
			});
		} else {
			if (triggerRef.current instanceof HTMLElement) {
				triggerRef.current.focus();
			}
			triggerRef.current = null;
		}
	}, [open]);

	// Focus trap: keep Tab / Shift+Tab inside the dialog
	useEffect(() => {
		if (!open) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
				return;
			}
			if (e.key !== "Tab") return;
			const dialog = dialogRef.current;
			if (!dialog) return;
			const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
				(el) => !el.closest("[aria-hidden='true']"),
			);
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

	if (!open) return null;

	const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.target === e.currentTarget) onClose();
	};

	const handleBackdropKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key === "Escape") onClose();
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 !mt-0"
			aria-hidden="true"
			onClick={handleBackdropClick}
			onKeyDown={handleBackdropKeyDown}
		>
			<dialog
				ref={dialogRef}
				open
				aria-modal="true"
				aria-labelledby="modal-title"
				className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-card p-6 shadow-lg"
			>
				<div className="mb-4 flex items-center justify-between">
					<h2 id="modal-title" className="text-lg font-semibold">
						{title}
					</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close dialog"
						className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
					>
						&#x2715;
					</button>
				</div>
				{children}
			</dialog>
		</div>
	);
}
