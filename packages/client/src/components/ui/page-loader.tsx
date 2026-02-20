export function PageLoader() {
	return (
		<output
			className="flex h-full min-h-[400px] items-center justify-center"
			aria-label="Loading page"
		>
			<div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
		</output>
	);
}
