//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as Position from '@dxos/util/Position';

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
      Surface.Root.create({
        id: 'home',
        filter: Surface.Root.makeFilter(AppSurface.Article, (data) => data.attendableId === GraphNode.RootId),
        component: Home,
      }),
      Surface.Root.create({
        id: 'navBranch',
        position: Position.last,
        filter: Surface.Root.makeFilter(
          AppSurface.Article,
          (data) => ALLOWED_DISPOSITIONS.includes(data.properties?.disposition) || data.properties?.role === 'branch',
        ),
        component: NavBranch,
        props: ({ data: { attendableId } }) => ({ id: attendableId }),
      }),
    ]);
  }),
);
