import { Modal } from "./modal";

interface ConfirmDialogProps {
	open: boolean;
	onClose: () => void;
	title: string;
	description: string;
	confirmLabel?: string;
	isPending?: boolean;
	onConfirm: () => void;
}

export function ConfirmDialog({
	open,
	onClose,
	title,
	description,
	confirmLabel = "Delete",
	isPending,
	onConfirm,
}: ConfirmDialogProps) {
	return (
		<Modal open={open} onClose={onClose} title={title}>
			<p className="text-sm text-muted-foreground">{description}</p>
			<div className="mt-4 flex justify-end gap-2">
				<button
					type="button"
					onClick={onClose}
					className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={onConfirm}
					disabled={isPending}
					className="rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
				>
					{isPending ? "Deleting..." : confirmLabel}
				</button>
			</div>
		</Modal>
	);
}
