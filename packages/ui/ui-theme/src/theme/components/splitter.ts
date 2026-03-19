//
// Copyright 2026 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';

export type SplitterStyleProps = {};

const splitterRoot: ComponentFunction<SplitterStyleProps> = (_props, ...etc) =>
  mx('relative h-full overflow-hidden', ...etc);

const splitterPanel: ComponentFunction<SplitterStyleProps> = (_props, ...etc) =>
  mx('absolute inset-x-0 flex flex-col overflow-hidden', ...etc);

export const splitterTheme: Theme<SplitterStyleProps> = {
  root: splitterRoot,
  panel: splitterPanel,
};
