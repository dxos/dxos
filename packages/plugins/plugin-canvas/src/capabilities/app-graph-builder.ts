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
import { Entity, Obj } from '@dxos/echo';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

import { Canvas } from '#types';

import { canvasViewAspect } from '../containers/CanvasArticle/view-state.ts';
import { CanvasNamespace } from '../namespace.ts';

// Module-level: the graph dedupes action properties by reference, so a tuple rebuilt per evaluation re-emits the node.
type LabelTuple = [string, { ns: string }];
const LOCK_LABEL: LabelTuple = ['lock-drawing.label', { ns: CanvasNamespace.key }];
const UNLOCK_LABEL: LabelTuple = ['unlock-drawing.label', { ns: CanvasNamespace.key }];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Read reactively, so the action appears once the capability lands.
    const viewStateCapabilityAtom = yield* Capability.atom(AttentionCapabilities.ViewState);

    const extension = yield* AppGraphBuilder.createExtension({
      id: 'canvasActions',
      match: (node, get) =>
        Option.filter(AppNodeMatcher.whenEchoType(Drawing.Drawing)(node, get), (drawing) =>
          Canvas.isSceneSchema(get(Obj.atom(drawing.canvas))?.schema),
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

    return Capability.contribute(AppCapabilities.AppGraphBuilder, [extension]);
  }),
);
