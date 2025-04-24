//
// Copyright 2025 DXOS.org
//

import { AccordionItem, AccordionItemHeader, AccordionItemBody } from './AccordionItem';
import { AccordionRoot } from './AccordionRoot';

// TODO(burdon): Next iteration should be based on Radix UI Accordion:
//  https://www.radix-ui.com/primitives/docs/components/accordion
// TODO(burdon): Support key navigation.

export const Accordion = {
  Root: AccordionRoot,
  Item: AccordionItem,
  ItemHeader: AccordionItemHeader,
  ItemBody: AccordionItemBody,
};
