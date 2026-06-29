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
  sm: 'h-(--dx-statusbar-size)',
};

const root: ComponentFunction<PanelStyleProps> = (_, ...etc) =>
  mx(
    'dx-container grid grid-cols-[100%] overflow-hidden',
    // Add uncategorized children to content slot.
    '[&>*:not([data-slot])]:[grid-area:content]',
    ...etc,
  );

// Toolbars default to the bar surface (tier 5); callers can still override via the trailing classes.
const toolbar: ComponentFunction<PanelStyleProps> = ({ size = 'md' }, ...etc) =>
  mx('[grid-area:toolbar]', 'shrink-0', 'bg-toolbar-surface', sizes[size], ...etc);

const content: ComponentFunction<PanelStyleProps> = (_, ...etc) => mx('[grid-area:content] min-h-0', ...etc);

const statusbar: ComponentFunction<PanelStyleProps> = ({ size = 'md' }, ...etc) =>
  mx('[grid-area:statusbar]', 'shrink-0', sizes[size], ...etc);

export const panelTheme = {
  root,
  toolbar,
  content,
  statusbar,
};
