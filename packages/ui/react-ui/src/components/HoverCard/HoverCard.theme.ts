//
// Copyright 2026 DXOS.org
//

import { type Theme } from '@dxos/ui-types';

import { type PopoverStyleProps, popoverTheme } from '../Popover/Popover.theme';

export type HoverCardStyleProps = PopoverStyleProps;

/** A hover card floats exactly as a popover does — same surface, border, shadow and arrow. */
export const hoverCardTheme: Theme<HoverCardStyleProps> = {
  positioner: popoverTheme.positioner,
  content: popoverTheme.content,
  arrow: popoverTheme.arrow,
};
