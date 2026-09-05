//
// Copyright 2025 DXOS.org
//

import { type ReactNode } from 'react';

import { createContext } from '@dxos/react-hooks';

// Kept out of `Select.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export const SELECT_NAME = 'Select';

/** What an option tells the root about itself: the collection is built from these. */
export type SelectOptionEntry = {
  value: string;
  /** What typeahead matches and the hidden `<select>` shows; the option's text content unless told otherwise. */
  text: string;
  /** What the trigger shows when this option is selected, as Radix's `ItemText` did. */
  node: ReactNode;
  disabled: boolean;
  element: HTMLElement | null;
};

export type SelectContextValue = {
  /** Registers an option; returns the unregister. */
  register(entry: SelectOptionEntry): () => void;
  entries: ReadonlyMap<string, SelectOptionEntry>;
};

export const [SelectProvider, useSelectContext] = createContext<SelectContextValue>(SELECT_NAME);
