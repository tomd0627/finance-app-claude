interface EmptyStateProps {
	icon: React.ReactNode;
	title: string;
	description?: string;
	action?: {
		label: string;
		onClick: () => void;
	};
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
			<div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-2xl">
				{icon}
			</div>
			<div className="space-y-1">
				<h3 className="text-sm font-medium">{title}</h3>
				{description && <p className="text-sm text-muted-foreground">{description}</p>}
			</div>
			{action && (
				<button
					type="button"
					onClick={action.onClick}
					className="mt-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
				>
					{action.label}
				</button>
			)}
		</div>
	);
}
