//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

export type SplitterStyleProps = {};

const root: ComponentFunction<SplitterStyleProps> = (_props, ...etc) => mx('relative h-full overflow-hidden', ...etc);

const panel: ComponentFunction<SplitterStyleProps> = (_props, ...etc) =>
  mx('absolute inset-x-0 flex flex-col overflow-hidden', ...etc);

export const splitterTheme: Theme<SplitterStyleProps> = {
  root,
  panel,
};
