//
// Copyright 2026 DXOS.org
//

import { type ComponentFunction } from '@dxos/ui-types';

import { mx } from '../../util';

const panelRoot: ComponentFunction<{}> = (_, ...etc) =>
  mx('h-full w-full grid grid-cols-[100%] overflow-hidden', ...etc);

const panelToolbar: ComponentFunction<{}> = (_, ...etc) =>
  mx(
    '[grid-area:toolbar]',
    'border-b border-subdued-separator relative',
    '[.dx-main-mobile-layout_&]:px-3',
    ...etc,
  );

const panelContent: ComponentFunction<{}> = (_, ...etc) => mx('[grid-area:content] overflow-hidden min-h-0', ...etc);

const panelStatusbar: ComponentFunction<{}> = (_, ...etc) => mx('[grid-area:statusbar]', ...etc);

export const panelTheme = {
  root: panelRoot,
  toolbar: panelToolbar,
  content: panelContent,
  statusbar: panelStatusbar,
};
