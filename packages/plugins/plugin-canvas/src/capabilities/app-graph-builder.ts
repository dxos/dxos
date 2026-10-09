//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import { Obj } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

import { meta } from '#meta';
import { Canvas, CanvasCapabilities } from '#types';

// Module-level: the graph dedupes action properties by reference, so a tuple rebuilt per evaluation re-emits the node.
type LabelTuple = [string, { ns: string }];
const DOCK_PANELS_LABEL: LabelTuple = ['dock-panels.label', { ns: meta.profile.key }];
const FLOAT_PANELS_LABEL: LabelTuple = ['float-panels.label', { ns: meta.profile.key }];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const settingsCapabilityAtom = yield* Capability.atom(CanvasCapabilities.Settings);

    const extension = yield* AppGraphBuilder.createExtension({
      id: 'dockPanels',
      match: (node, get) =>
        Option.filter(
          AppNodeMatcher.whenEchoType(Drawing.Drawing)(node, get),
          (drawing) => get(Obj.atom(drawing.canvas))?.schema === Canvas.SCENE_SCHEMA,
        ),
      actions: (drawing, get) => {
        const [settingsAtom] = get(settingsCapabilityAtom);
        // The item flips the mode, so it names the one it switches to.
        const docked = !settingsAtom || (get(settingsAtom).dockPanels ?? true);
        return Effect.succeed([
          AppGraphNode.makeAction({
            id: `${drawing.id}.dockPanels`,
            data: () =>
              Capabilities.updateAtomValue(CanvasCapabilities.Settings, (settings) => ({
                ...settings,
                dockPanels: !docked,
              })),
            properties: {
              label: docked ? FLOAT_PANELS_LABEL : DOCK_PANELS_LABEL,
              icon: docked ? 'ph--arrow-square-out--regular' : 'ph--sidebar-simple--regular',
              testId: 'canvas.dock-panels',
            },
          }),
        ]);
      },
    });

    return Capability.contribute(AppCapabilities.AppGraphBuilder, [extension]);
  }),
);
