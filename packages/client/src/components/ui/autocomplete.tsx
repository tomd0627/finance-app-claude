import { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface AutocompleteProps {
	id: string;
	value: string;
	onChange: (value: string) => void;
	suggestions: string[];
	placeholder?: string;
	className?: string;
	onBlur?: () => void;
	name?: string;
}

export function Autocomplete({
	id,
	value,
	onChange,
	suggestions,
	placeholder,
	className,
	onBlur,
	name,
}: AutocompleteProps) {
	const listboxId = useId();
	const [open, setOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);
	const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
	const inputRef = useRef<HTMLInputElement>(null);

	const filtered =
		value.trim().length === 0
			? []
			: suggestions
					.filter(
						(s) =>
							s.toLowerCase().includes(value.toLowerCase()) &&
							s.toLowerCase() !== value.toLowerCase(),
					)
					.slice(0, 8);

	const isOpen = open && filtered.length > 0;

	// Calculate dropdown position when it opens (portal, so position: fixed)
	useLayoutEffect(() => {
		if (isOpen && inputRef.current) {
			const rect = inputRef.current.getBoundingClientRect();
			setDropdownStyle({
				position: "fixed",
				top: rect.bottom + 4,
				left: rect.left,
				width: rect.width,
				zIndex: 9999,
			});
		}
	}, [isOpen]);

	const selectSuggestion = (suggestion: string) => {
		onChange(suggestion);
		setOpen(false);
		setActiveIndex(-1);
		inputRef.current?.focus();
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (!isOpen) {
			if (e.key === "ArrowDown" && filtered.length > 0) {
				setOpen(true);
				setActiveIndex(0);
				e.preventDefault();
			}
			return;
		}
		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
				break;
			case "ArrowUp":
				e.preventDefault();
				setActiveIndex((i) => Math.max(i - 1, -1));
				break;
			case "Enter":
				if (activeIndex >= 0) {
					e.preventDefault();
					selectSuggestion(filtered[activeIndex]);
				}
				break;
			case "Escape":
				e.stopPropagation(); // Prevent modal from closing while dropdown is open
				setOpen(false);
				setActiveIndex(-1);
				break;
			case "Tab":
				setOpen(false);
				break;
		}
	};

	return (
		<div className="relative">
			<input
				ref={inputRef}
				id={id}
				name={name}
				type="text"
				role="combobox"
				aria-expanded={isOpen}
				aria-autocomplete="list"
				aria-controls={isOpen ? listboxId : undefined}
				aria-activedescendant={
					isOpen && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
				}
				value={value}
				onChange={(e) => {
					onChange(e.target.value);
					setOpen(true);
					setActiveIndex(-1);
				}}
				onFocus={() => setOpen(true)}
				onBlur={() => {
					setTimeout(() => setOpen(false), 150);
					onBlur?.();
				}}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				autoComplete="off"
				className={className}
			/>
			{isOpen &&
				createPortal(
					<div
						id={listboxId}
						role="listbox"
						tabIndex={-1}
						aria-label="Suggestions"
						style={dropdownStyle}
						className="rounded-md border bg-popover py-1 shadow-md"
					>
						{filtered.map((suggestion, index) => (
							<div
								key={suggestion}
								id={`${listboxId}-option-${index}`}
								role="option"
								tabIndex={-1}
								aria-selected={index === activeIndex}
								onMouseDown={(e) => {
									e.preventDefault();
									selectSuggestion(suggestion);
								}}
								className={`cursor-pointer px-3 py-1.5 text-sm text-popover-foreground ${
									index === activeIndex
										? "bg-accent text-accent-foreground"
										: "hover:bg-accent hover:text-accent-foreground"
								}`}
							>
								{suggestion}
							</div>
						))}
					</div>,
					document.body,
				)}
		</div>
	);
}
