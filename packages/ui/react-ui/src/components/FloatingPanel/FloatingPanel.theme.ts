//
// Copyright 2026 DXOS.org
//

import { mx, surfaceShadow } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

export type FloatingPanelStyleProps = {};

/**
 * The positioned frame. The machine places it with inline `top`/`left` from `--x`/`--y`; its layer
 * is set inline too (see `FloatingPanel.Content`), since the machine's own inline `--z-index` is the
 * stack order among open panels and would override a variable set from here.
 */
const positioner: ComponentFunction<FloatingPanelStyleProps> = (_props, ...etc) => mx(...etc);

/**
 * The window. Sized by the machine through `--width`/`--height`; a column so the header keeps its
 * height and the body takes the rest, clipped at the rounded edge. A minimized panel is the header
 * alone (the machine shrinks the height to it), so the body must not be able to push the frame open.
 */
const content: ComponentFunction<FloatingPanelStyleProps> = (_props, ...etc) =>
  mx(
    'dx-modal-surface border border-separator rounded-sm flex flex-col overflow-hidden dx-focus-ring',
    surfaceShadow({ elevation: 'positioned' }),
    'data-[behind]:opacity-95',
    ...etc,
  );

/** Title row: the drag handle by default, hence the cursor the machine sets on the drag trigger. */
const header: ComponentFunction<FloatingPanelStyleProps> = (_props, ...etc) =>
  mx('flex items-center shrink-0 gap-1 pl-3 pr-1 min-h-(--dx-control) border-b border-separator select-none', ...etc);

const title: ComponentFunction<FloatingPanelStyleProps> = (_props, ...etc) =>
  mx('grow truncate text-sm font-medium', ...etc);

/** The header's draggable area: wraps the title so the whole strip moves the panel. */
const dragTrigger: ComponentFunction<FloatingPanelStyleProps> = (_props, ...etc) =>
  mx('flex grow items-center min-w-0 self-stretch', ...etc);

const control: ComponentFunction<FloatingPanelStyleProps> = (_props, ...etc) =>
  mx('flex items-center shrink-0', ...etc);

const body: ComponentFunction<FloatingPanelStyleProps> = (_props, ...etc) => mx('dx-expand overflow-hidden', ...etc);

/**
 * A resize handle. The machine positions each one on its edge or corner and sets the cursor; only the
 * thickness is ours — an edge is a strip along its side, a corner a square over both.
 */
const resizeTrigger: ComponentFunction<FloatingPanelStyleProps> = (_props, ...etc) =>
  mx(
    'data-[axis=n]:h-1 data-[axis=s]:h-1 data-[axis=e]:w-1 data-[axis=w]:w-1',
    'data-[axis=ne]:size-2 data-[axis=nw]:size-2 data-[axis=se]:size-2 data-[axis=sw]:size-2',
    'data-[disabled]:hidden',
    ...etc,
  );

export const floatingPanelTheme: Theme<FloatingPanelStyleProps> = {
  positioner,
  content,
  header,
  title,
  dragTrigger,
  control,
  body,
  resizeTrigger,
};
