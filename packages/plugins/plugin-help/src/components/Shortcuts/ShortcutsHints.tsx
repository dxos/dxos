//
// Copyright 2023 DXOS.org
//

import React from "react";

import { type KeyBinding, Keyboard } from "@dxos/keyboard";
import { IconButton, toLocalizedString, useTranslation } from "@dxos/react-ui";

import { Key } from "./Key";

const Shortcut = ({ binding }: { binding: KeyBinding }) => {
	const { t } = useTranslation("os");
	return (
		<div role="none" className="flex items-center gap-2 whitespace-nowrap">
			<Key binding={binding.shortcut} />
			<span className="text-sm">{toLocalizedString(binding.data, t)}</span>
		</div>
	);
};

export const ShortcutsHints = ({ onClose }: { onClose?: () => void }) => {
	// TODO(burdon): Display by context/weight/cycle.
	const defaults = ["meta+k", "meta+/", "meta+,"];
	const bindings = Keyboard.singleton.getBindings();
	const hints = bindings.filter((binding) =>
		defaults.includes(binding.shortcut),
	);

	return (
		<div role="none" className="flex overflow-hidden px-2 gap-4">
			{hints.map((binding) => (
				<Shortcut key={binding.shortcut} binding={binding} />
			))}
			{onClose && (
				<IconButton
					icon="ph--x--regular"
					size={4}
					label="Close"
					iconOnly
					noTooltip
					variant="ghost"
					classNames="p-0 cursor-pointer"
					onClick={onClose}
				/>
			)}
		</div>
	);
};
