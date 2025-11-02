//
// Copyright 2023 DXOS.org
//

import React, { useEffect } from "react";

import { Button, Icon, IconButton, useControlledState } from "@dxos/react-ui";

export type PagerProps = {
	index?: number;
	count?: number;
	keys?: boolean; // TODO(burdon): Rename.
	onChange?: (index: number) => void;
	onExit?: () => void;
};

export const Pager = ({
	index: indexParam = 0,
	count = 0,
	keys,
	onChange,
	onExit,
}: PagerProps) => {
	const [index, setIndex] = useControlledState(indexParam);
	useEffect(() => {
		onChange?.(index);
	}, [index]);

	const handleChangeIndex = (dir: number) => {
		setIndex((index) => {
			const next = index + dir;
			return next >= 0 && next < count ? next : index;
		});
	};

	// TODO(burdon): Standardize via system key binding.
	useEffect(() => {
		if (!keys) {
			return;
		}

		const keydownHandler = (event: KeyboardEvent) => {
			switch (event.key) {
				case "Escape": {
					onExit?.();
					break;
				}
				case "ArrowLeft": {
					if (event.shiftKey) {
						onChange?.(0);
					} else {
						handleChangeIndex(-1);
					}
					break;
				}
				case "ArrowRight": {
					if (event.shiftKey) {
						onChange?.(count - 1);
					} else {
						handleChangeIndex(1);
					}
					break;
				}
				case "ArrowUp": {
					onChange?.(0);
					break;
				}
				case "ArrowDown": {
					onChange?.(count - 1);
					break;
				}
			}
		};

		window.addEventListener("keydown", keydownHandler);
		return () => window.removeEventListener("keydown", keydownHandler);
	}, [keys, count]);

	if (index === undefined || !count) {
		return null;
	}

	return (
		<div className="flex items-center text-neutral-500">
			<IconButton
				icon="ph--caret-double-left--regular"
				size={6}
				label="Jump to first"
				iconOnly
				noTooltip
				variant="ghost"
				classNames="p-0"
				onClick={() => onChange?.(0)}
			/>
			<IconButton
				icon="ph--caret-left--regular"
				size={6}
				label="Previous"
				iconOnly
				noTooltip
				variant="ghost"
				classNames="p-0"
				onClick={() => handleChangeIndex(-1)}
			/>
			<IconButton
				icon="ph--caret-right--regular"
				size={6}
				label="Next"
				iconOnly
				noTooltip
				variant="ghost"
				classNames="p-0"
				onClick={() => handleChangeIndex(1)}
			/>
			<IconButton
				icon="ph--caret-double-right--regular"
				size={6}
				label="Jump to last"
				iconOnly
				noTooltip
				variant="ghost"
				classNames="p-0"
				onClick={() => onChange?.(count - 1)}
			/>
		</div>
	);
};

export type PageNumberProps = {
	index?: number;
	count?: number;
};

export const PageNumber = ({ index = 0, count = 1 }: PageNumberProps) => {
	if (index === undefined || !count) {
		return null;
	}

	return (
		<div className="flex items-center text-neutral-500 text-2xl">
			<div>
				{index + 1} / {count}
			</div>
		</div>
	);
};

export const StartButton = ({
	running,
	onClick,
}: {
	running?: boolean;
	onClick?: (start: boolean) => void;
}) => {
	return (
		<IconButton
			icon={running ? "ph--x--regular" : "ph--play--regular"}
			size={6}
			label={running ? "Stop" : "Play"}
			iconOnly
			noTooltip
			variant="ghost"
			classNames="p-0"
			onClick={() => onClick?.(!running)}
		/>
	);
};
