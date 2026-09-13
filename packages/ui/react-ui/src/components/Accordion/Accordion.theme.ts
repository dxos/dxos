//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import type { ComponentFunction } from '@dxos/ui-types';

export type AccordionStyleProps = {
  /** Apply `dx-hover` row styling on the trigger (off by default; mirrors `Listbox.Item`). */
  hover?: boolean;
};

// No `overflow-hidden` here: the body does its own clipping for the slide, and clipping at the item
// would cut the top and bottom edges off the trigger's inset focus ring. The end items instead carry
// the frame's own rounding, which the header and trigger inherit so a focus ring at either end
// follows the corner rather than cutting across it.
const item: ComponentFunction<AccordionStyleProps> = (_props, ...etc) =>
  mx('first:rounded-t-md last:rounded-b-md', ...etc);

const header: ComponentFunction<AccordionStyleProps> = (_props, ...etc) =>
  mx('flex items-start rounded-[inherit]', ...etc);

/** Row trigger: spans the full width and pins the trailing caret to the inline-end edge. */
const trigger: ComponentFunction<AccordionStyleProps> = ({ hover }, ...etc) =>
  mx(
    'group flex items-start justify-between gap-trim-sm p-trim-sm dx-focus-ring-inset w-full text-start rounded-[inherit]',
    hover && 'dx-hover',
    ...etc,
  );

/** Leading / trailing icon wrappers: fixed height so they sit on the centerline of the first content line. */
const triggerIcon: ComponentFunction<AccordionStyleProps> = (_props, ...etc) =>
  mx('flex items-center h-(--dx-control-sm) shrink-0', ...etc);

const triggerContent: ComponentFunction<AccordionStyleProps> = (_props, ...etc) => mx('min-w-0 flex-1', ...etc);

/** Interactive controls that sit beside the trigger; matches its vertical padding. */
const trailing: ComponentFunction<AccordionStyleProps> = (_props, ...etc) =>
  mx('flex items-center h-(--dx-control-sm) shrink-0 my-trim-sm me-trim-sm', ...etc);

/** Slide animations are driven by the Ark accordion's data-state attribute. */
const body: ComponentFunction<AccordionStyleProps> = (_props, ...etc) =>
  mx('overflow-hidden data-[state=closed]:animate-slide-up data-[state=open]:animate-slide-down', ...etc);

const bodyContent: ComponentFunction<AccordionStyleProps> = (_props, ...etc) => mx('p-trim-sm', ...etc);

export const accordionTheme = {
  item,
  header,
  trigger,
  triggerIcon,
  triggerContent,
  trailing,
  body,
  bodyContent,
};
