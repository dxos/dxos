//
// Copyright 2025 DXOS.org
//

import { AccordionItem, AccordionItemBody, AccordionItemHeader } from './AccordionItem';
import { AccordionRoot } from './AccordionRoot';

// Built on `@ark-ui/react`'s Accordion (zag state machine), which carries the APG keymap for key
// navigation.

export const Accordion = {
  Root: AccordionRoot,
  Item: AccordionItem,
  ItemHeader: AccordionItemHeader,
  ItemBody: AccordionItemBody,
};
