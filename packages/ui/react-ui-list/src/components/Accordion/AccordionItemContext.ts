//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';

// See `AccordionRoot.tsx` for the rationale on `ListItemRecord = any`.
type ListItemRecord = any;

export const ACCORDION_ITEM_NAME = 'AccordionItem';

type AccordionItemContext<T extends ListItemRecord> = {
  item: T;
};

// Kept out of `AccordionItem.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context exported beside one forces a full page reload on every edit.
//
// TODO(wittjosiah): This seems to be conflicting with something in the bundle.
//  Perhaps @radix-ui/react-accordion?
export const [AccordionItemProvider, useDxAccordionItemContext] =
  createContext<AccordionItemContext<any>>(ACCORDION_ITEM_NAME);
