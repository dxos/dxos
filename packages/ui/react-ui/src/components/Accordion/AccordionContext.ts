//
// Copyright 2025 DXOS.org
//

import { createContext } from '@dxos/react-hooks';

// Records flowing through this compound carry caller-defined shapes (any record with an optional
// `id` is acceptable; `getId` defaults to reading `.id`). Typed as `any` so the generic parameter
// remains the caller's source of truth.
export type AccordionItemRecord = any;

export const ACCORDION_NAME = 'Accordion';
export const ACCORDION_ITEM_NAME = 'AccordionItem';

type AccordionContext<T extends AccordionItemRecord> = {
  getId: (item: T) => string;
};

type AccordionItemContext<T extends AccordionItemRecord> = {
  item: T;
};

// Kept out of the component modules: react-refresh only fast-refreshes a module whose exports are all
// components, so a context exported beside one forces a full page reload on every edit.
export const [AccordionProvider, useAccordionContext] = createContext<AccordionContext<any>>(ACCORDION_NAME);
export const [AccordionItemProvider, useAccordionItemContext] =
  createContext<AccordionItemContext<any>>(ACCORDION_ITEM_NAME);
