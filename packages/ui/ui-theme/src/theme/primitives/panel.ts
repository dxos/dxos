//
// Copyright 2026 DXOS.org
//

import { type ComponentFunction } from '@dxos/ui-types';

import { mx } from '../../util';

type Size = 'lg' | 'md' | 'sm';

export type PanelStyleProps = {
  size?: Size;
};

const sizes: Record<Size, string> = {
  lg: 'h-(--dx-topbar-size)',
  md: 'h-(--dx-toolbar-size)',
  sm: 'h-(--dx-statusbar-size)',
};

const panelRoot: ComponentFunction<PanelStyleProps> = (_, ...etc) =>
  mx(
    // prettier-ignore
    'dx-container grid grid-cols-[100%] overflow-hidden',
    // Add uncategorized children to content slot.
    '[&>*:not([data-slot])]:[grid-area:content]',
    ...etc,
  );

const panelToolbar: ComponentFunction<PanelStyleProps> = ({ size = 'md' }, ...etc) =>
  mx('[grid-area:toolbar]', 'shrink-0', sizes[size], ...etc);

const panelContent: ComponentFunction<PanelStyleProps> = (_, ...etc) => mx('[grid-area:content] min-h-0', ...etc);

const panelStatusbar: ComponentFunction<PanelStyleProps> = ({ size = 'md' }, ...etc) =>
  mx('[grid-area:statusbar]', 'shrink-0', sizes[size], ...etc);

export const panelTheme = {
  root: panelRoot,
  toolbar: panelToolbar,
  content: panelContent,
  statusbar: panelStatusbar,
};
