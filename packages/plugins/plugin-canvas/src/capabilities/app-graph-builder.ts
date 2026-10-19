//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { Entity, Obj, Ref } from '@dxos/echo';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

import { meta } from '#meta';
import { Canvas, CanvasOperation } from '#types';

import { canvasViewAspect } from '../containers/CanvasArticle/view-state.ts';

// Module-level: the graph dedupes action properties by reference, so a tuple rebuilt per evaluation re-emits the node.
type LabelTuple = [string, { ns: string }];
const LOCK_LABEL: LabelTuple = ['lock-drawing.label', { ns: meta.profile.key }];
const UNLOCK_LABEL: LabelTuple = ['unlock-drawing.label', { ns: meta.profile.key }];
const IMPORT_TLDRAW_LABEL: LabelTuple = ['import-tldraw.label', { ns: meta.profile.key }];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
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
        // The mode is this viewer's, kept in the canvas's view state where the article reads it; the item flips it, so
        // it names the one it switches to.
        const [viewState] = get(viewStateCapabilityAtom);
        const canvas = drawing.canvas.target;
        const contextId = canvas && Entity.getURI(canvas);
        const state = viewState && contextId ? get(viewState.atom(canvasViewAspect, contextId)) : {};
        // A viewer who has not chosen sees the drawing's own default (a template's drawings open read-only). Read from
        // the canvas record inline: `#model` would pull React into the plugin's node and workerd entries.
        const record: unknown = get(Obj.atom(drawing.canvas))?.content?.canvas;
        const readonlyDefault =
          typeof record === 'object' && record !== null && Reflect.get(record, 'readonly') === true;
        const readonly = state.readonly ?? readonlyDefault;
        const toggle = () =>
          Effect.sync(() => {
            if (viewState && contextId) {
              viewState.update(canvasViewAspect, contextId, (state) => ({
                ...state,
                readonly: !(state.readonly ?? readonlyDefault),
              }));
            }
          });
        return Effect.succeed([
          AppGraphNode.makeAction({
            id: `${drawing.id}.readonly`,
            data: toggle,
            properties: {
              label: readonly ? UNLOCK_LABEL : LOCK_LABEL,
              icon: readonly ? 'ph--pencil-simple--regular' : 'ph--lock-simple--regular',
              disposition: 'list-item',
              testId: 'canvas.readonly',
            },
          }),
        ]);
      },
    });

    // Contributed here, keyed by the tldraw dialect, so plugin-tldraw takes no dependency on this plugin.
    const importTldraw = yield* AppGraphBuilder.createExtension({
      id: 'importTldraw',
      match: (node, get) =>
        Option.filter(
          AppNodeMatcher.whenEchoType(Drawing.Drawing)(node, get),
          (drawing) => get(Obj.atom(drawing.canvas))?.schema === Canvas.TLDRAW_SCHEMA,
        ),
      actions: (drawing) =>
        Effect.succeed([
          AppGraphNode.makeAction({
            id: `${drawing.id}.importTldraw`,
            data: () =>
              Effect.gen(function* () {
                // The handler runs against the drawing's own space, which the action context does not supply.
                const result = yield* Operation.invoke(
                  CanvasOperation.ImportTldraw,
                  { drawing: Ref.make(drawing) },
                  { spaceId: Obj.getDatabase(drawing)?.spaceId },
                );
                const created = yield* Effect.promise(() => result.drawing.load());
                yield* Operation.invoke(LayoutOperation.Open, {
                  subject: [GraphPath.getObjectPathFromObject(created)],
                });
              }),
            properties: {
              label: IMPORT_TLDRAW_LABEL,
              icon: CanvasOperation.ImportTldraw.meta.icon,
              disposition: 'list-item',
              testId: 'canvas.importTldraw',
            },
          }),
        ]),
    });

    return Capability.contribute(AppCapabilities.AppGraphBuilder, [extension, importTldraw]);
  }),
);
