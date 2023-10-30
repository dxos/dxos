//
// Copyright 2023 DXOS.org
//

import type { Node } from '@braneframe/plugin-graph';
import type { Layout } from '@dxos/app-framework';

export const LAYOUT_PLUGIN = 'dxos.org/plugin/layout';

export type LayoutState = Layout & {
  activeNode: Node | undefined;
  previousNode: Node | undefined;
};
