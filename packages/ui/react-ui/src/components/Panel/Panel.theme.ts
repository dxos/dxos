//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction } from '@dxos/ui-types';

type Size = 'lg' | 'md' | 'sm';

export type PanelStyleProps = {
  size?: Size;
};

const sizes: Record<Size, string> = {
  lg: 'h-(--dx-topbar-size)',
  md: 'h-(--dx-toolbar-size)',
  // One control step down, so a density=sm toolbar reads shorter than the default bar.
  sm: 'h-(--dx-control-md)',
};

const root: ComponentFunction<PanelStyleProps> = (_, ...etc) =>
  mx(
    'dx-container grid grid-cols-[100%] overflow-hidden',
    // Add uncategorized children to content slot.
    '[&>*:not([data-slot])]:[grid-area:content]',
    ...etc,
  );

// `bar` is an aspect, not a level: the toolbar steps off whichever surface hosts the panel, so a
// panel in a card and a panel on the canvas each get a bar that reads against their own host.
const toolbar: ComponentFunction<PanelStyleProps> = ({ size = 'md' }, ...etc) =>
  mx(
    '[grid-area:toolbar]',
    'shrink-0',
    // The shadow falls onto the content row, which paints after this one in DOM order and would
    // cover it wherever the content has its own background — the editor did, the mailbox list did
    // not, which is why the bar looked flat in one and raised in the other.
    'dx-toolbar-surface shadow-sm relative z-[1]',
    sizes[size],
    ...etc,
  );

const content: ComponentFunction<PanelStyleProps> = (_, ...etc) => mx('[grid-area:content] min-h-0', ...etc);

const statusbar: ComponentFunction<PanelStyleProps> = (_, ...etc) =>
  mx('[grid-area:statusbar]', 'shrink-0', 'dx-toolbar-surface', ...etc);

export const panelTheme = {
  root,
  toolbar,
  content,
  statusbar,
};
