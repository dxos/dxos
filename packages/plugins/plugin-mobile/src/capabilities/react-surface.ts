//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import * as GraphNode from '@dxos/graph/GraphNode';
import { Position } from '@dxos/util';

import { Home, NavBranch } from '#components';

// 'group' covers AppNode.makeGroup's navtree section-group nodes (Communications, Content,
// Assistant, System, …) — they carry no role, only disposition, so without it mobile pushed a
// blank panel for every category row except the role:'branch' ones (e.g. Settings).
const ALLOWED_DISPOSITIONS = ['workspace', 'user-account', 'pin-end', 'group'];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Mobile projects the graph root and branch/workspace nodes onto their own full-screen
    // surfaces instead of the desktop deck's plank rendering.
    return Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'home',
        filter: Surface.makeFilter(AppSurface.Article, (data) => data.attendableId === GraphNode.RootId),
        component: Home,
      }),
      Surface.create({
        id: 'navBranch',
        position: Position.last,
        filter: Surface.makeFilter(
          AppSurface.Article,
          (data) => ALLOWED_DISPOSITIONS.includes(data.properties?.disposition) || data.properties?.role === 'branch',
        ),
        component: NavBranch,
        props: ({ data: { attendableId } }) => ({ id: attendableId }),
      }),
    ]);
  }),
);
