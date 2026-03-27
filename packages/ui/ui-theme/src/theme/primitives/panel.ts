//
// Copyright 2026 DXOS.org
//

import { type ComponentFunction } from '@dxos/ui-types';

import { mx } from '../../util';

export type PanelStyleProps = {};

const panelRoot: ComponentFunction<PanelStyleProps> = (_, ...etc) =>
  mx(
    // prettier-ignore
    'h-full w-full grid grid-cols-[100%] overflow-hidden',
    // Add uncategorized children to content slot.
    '[&>*:not([data-slot])]:[grid-area:content]',
    ...etc,
  );

const panelToolbar: ComponentFunction<PanelStyleProps> = (_, ...etc) =>
  mx(
    // prettier-ignore
    '[grid-area:toolbar]',
    'h-(--dx-toolbar-size)', // TODO(burdon): Option.
    '[.dx-main-mobile-layout_&]:px-3',
    // 'border-b border-subdued-separator relative',
    ...etc,
  );

const panelContent: ComponentFunction<PanelStyleProps> = (_, ...etc) =>
  mx(
    // prettier-ignore
    '[grid-area:content] overflow-hidden min-h-0',
    ...etc,
  );

const panelStatusbar: ComponentFunction<PanelStyleProps> = (_, ...etc) =>
  mx(
    // prettier-ignore
    '[grid-area:statusbar]',
    'h-(--dx-statusbar-size)', // TODO(burdon): Option.
    ...etc,
  );

export const panelTheme = {
  root: panelRoot,
  toolbar: panelToolbar,
  content: panelContent,
  statusbar: panelStatusbar,
};
