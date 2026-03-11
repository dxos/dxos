//
// Copyright 2026 DXOS.org
//

import { type ComponentFunction } from '@dxos/ui-types';

import { mx } from '../../util';

export type PanelProps = {};

const panelRoot: ComponentFunction<PanelProps> = (_, ...etc) =>
  mx(
    // prettier-ignore
    'h-full w-full grid grid-cols-[100%] overflow-hidden',
    '[&>*:not([data-slot])]:[grid-area:content]',
    ...etc,
  );

const panelToolbar: ComponentFunction<PanelProps> = (_, ...etc) =>
  mx(
    // prettier-ignore
    '[grid-area:toolbar]',
    'border-b border-subdued-separator relative',
    '[.dx-main-mobile-layout_&]:px-3',
    ...etc,
  );

const panelContent: ComponentFunction<PanelProps> = (_, ...etc) =>
  mx(
    // prettier-ignore
    '[grid-area:content] overflow-hidden min-h-0',
    ...etc,
  );

const panelStatusbar: ComponentFunction<PanelProps> = (_, ...etc) =>
  mx(
    // prettier-ignore
    '[grid-area:statusbar]',
    ...etc,
  );

export const panelTheme = {
  root: panelRoot,
  toolbar: panelToolbar,
  content: panelContent,
  statusbar: panelStatusbar,
};
