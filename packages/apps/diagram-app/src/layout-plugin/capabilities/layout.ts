//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

import { parseRoute } from '../../shared/index.ts';
import { DiagramAppCapabilities } from '../types/index.ts';

/** A diagram's graph path, as Composer names it: what presence sends and a follower opens. */
const getDrawingPath = (spaceId: string, drawingId: string): string =>
  GraphPath.getObjectPath(spaceId, GraphPath.getTypeSlug(Drawing.Drawing), drawingId);

/**
 * One diagram, nothing else open: plugins that read the layout see the open space as the workspace and its diagram as
 * the one item, by their graph paths, so presence, Jump and follow work as in Composer.
 */
export default Capability.makeModule(() =>
  Effect.sync(() => {
    const state = Atom.make<DiagramAppCapabilities.LayoutState>({
      route: parseRoute(window.location.pathname),
      dialogOpen: false,
      dialogType: 'default',
      dialogDismissals: 0,
      popoverOpen: false,
      popoverKind: 'base',
      sharing: false,
      toasts: [],
      workspace: 'default',
    }).pipe(Atom.keepAlive);

    const layout = Atom.make((get): AppCapabilities.Layout => {
      const { dialogOpen, route, workspace } = get(state);
      return {
        mode: 'diagram',
        dialogOpen,
        sidebarOpen: false,
        complementarySidebarOpen: false,
        workspace: route.spaceId ? GraphPath.getSpacePath(route.spaceId) : workspace,
        active: route.spaceId && route.drawingId ? [getDrawingPath(route.spaceId, route.drawingId)] : [],
        inactive: [],
        scrollIntoView: undefined,
      };
    });

    return [
      Capability.contribute(DiagramAppCapabilities.LayoutState, state),
      Capability.contribute(AppCapabilities.Layout, layout),
    ];
  }),
);
