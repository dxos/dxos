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
import { Entity, Obj } from '@dxos/echo';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

import { meta } from '#meta';
import { Canvas, CanvasCapabilities } from '#types';

import { canvasViewModeAspect } from '../containers/CanvasArticle/view-mode.ts';

// Module-level: the graph dedupes action properties by reference, so a tuple rebuilt per evaluation re-emits the node.
type LabelTuple = [string, { ns: string }];
const DOCK_PANELS_LABEL: LabelTuple = ['dock-panels.label', { ns: meta.profile.key }];
const FLOAT_PANELS_LABEL: LabelTuple = ['float-panels.label', { ns: meta.profile.key }];
const LOCK_LABEL: LabelTuple = ['lock-drawing.label', { ns: meta.profile.key }];
const UNLOCK_LABEL: LabelTuple = ['unlock-drawing.label', { ns: meta.profile.key }];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const settingsCapabilityAtom = yield* Capability.atom(CanvasCapabilities.Settings);
    // Read reactively, so the action appears once the capability lands.
    const viewStateCapabilityAtom = yield* Capability.atom(AttentionCapabilities.ViewState);

    const extension = yield* AppGraphBuilder.createExtension({
      id: 'canvasActions',
      match: (node, get) =>
        Option.filter(
          AppNodeMatcher.whenEchoType(Drawing.Drawing)(node, get),
          (drawing) => get(Obj.atom(drawing.canvas))?.schema === Canvas.SCENE_SCHEMA,
        ),
      actions: (drawing, get) => {
        const [settingsAtom] = get(settingsCapabilityAtom);
        // The item flips the mode, so it names the one it switches to.
        const docked = !settingsAtom || (get(settingsAtom).dockPanels ?? true);
        // Read-only is this viewer's, kept in the canvas's view state where the article reads it.
        const [viewState] = get(viewStateCapabilityAtom);
        const canvas = drawing.canvas.target;
        const contextId = canvas && Entity.getURI(canvas);
        const readonly =
          viewState && contextId ? get(viewState.atom(canvasViewModeAspect, contextId)).readonly === true : false;
        return Effect.succeed([
          AppGraphNode.makeAction({
            id: `${drawing.id}.readonly`,
            data: () =>
              Effect.sync(() => {
                if (viewState && contextId) {
                  viewState.update(canvasViewModeAspect, contextId, (state) => ({ ...state, readonly: !readonly }));
                }
              }),
            properties: {
              label: readonly ? UNLOCK_LABEL : LOCK_LABEL,
              icon: readonly ? 'ph--pencil-simple--regular' : 'ph--lock-simple--regular',
              testId: 'canvas.readonly',
            },
          }),
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
