//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { DXN } from '@dxos/keys';
import * as DeckCapabilities from '@dxos/plugin-deck/DeckCapabilities';
import type * as DeckSchema from '@dxos/plugin-deck/DeckSchema';
import * as Markdown from '@dxos/plugin-markdown/Markdown';

import { PresenterOperation } from '#types';

import { SlideArticle } from '../containers/SlideArticle/SlideArticle.tsx';
import { getPresentingPath } from '../paths.ts';

/**
 * Stands in for the deck plugin: `SetPresenting` sets the deck's fullscreen plank to the presented object's path,
 * which is all the article reads. With `slideSurface`, also renders linked documents as slides.
 */
export const createPresenterStoryPlugin = ({ slideSurface = false }: { slideSurface?: boolean } = {}) => {
  const ephemeralAtom = Atom.make<DeckSchema.EphemeralDeckState>({
    open: {},
    dialogOpen: false,
    dialogContent: null,
    popoverOpen: false,
    popoverContent: null,
    toasts: [],
  }).pipe(Atom.keepAlive);
  const setPresenting = PresenterOperation.SetPresenting.pipe(
    Operation.withHandler(({ object, state }) =>
      Effect.gen(function* () {
        const registry = yield* Capability.get(Capabilities.AtomRegistry);
        // A plank keyed by the object's id stands in for the open plank, so a document presents via its companion path.
        registry.update(ephemeralAtom, (ephemeral) => ({
          ...ephemeral,
          fullscreen: state ? getPresentingPath(object.id, object) : undefined,
        }));
      }),
    ),
  );

  return Plugin.define(
    Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.test.presentationArticle'), name: 'PresentationArticleStory' }),
  ).pipe(
    Plugin.addModule({
      id: 'deck',
      provides: [DeckCapabilities.EphemeralState, Capabilities.OperationHandler],
      activate: () =>
        Effect.succeed([
          Capability.contribute(DeckCapabilities.EphemeralState, ephemeralAtom),
          Capability.contribute(Capabilities.OperationHandler, OperationHandlerSet.make(setPresenting)),
        ]),
    }),
    Plugin.addModule({
      id: 'slide',
      provides: [Capabilities.ReactSurface],
      activate: () =>
        Effect.succeed(
          Capability.contribute(
            Capabilities.ReactSurface,
            slideSurface
              ? [
                  Surface.create({
                    id: 'slide',
                    filter: AppSurface.object(AppSurface.Slide, Markdown.Document),
                    component: SlideArticle,
                    props: ({ data }) => ({ ...data }),
                  }),
                ]
              : [],
          ),
        ),
    }),
    Plugin.make,
  );
};
