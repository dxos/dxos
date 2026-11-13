//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import type * as Translations from '@dxos/app-framework/Translations';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import * as DeckCapabilities from '@dxos/plugin-deck/DeckCapabilities';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { isNonNullable } from '@dxos/util';

import { firstHeading, slideSourcesAtom } from '#deck';
import { meta } from '#meta';
import { Presentation, PresenterOperation, SlideEditorViewState } from '#types';

import { isPresenting } from '../paths.ts';

/**
 * A Presentation is a folder of its sections (its node lists `sections` through the type's container
 * annotation); owned slides are labelled by name, else first heading, else position.
 */
export const createSectionsExtension = () =>
  AppGraphBuilder.createExtension({
    id: 'presentationSections',
    match: (node) => (Obj.instanceOf(Presentation.Presentation, node.data) ? Option.some(node.data) : Option.none()),
    connector: (presentation, get) => {
      const db = Obj.getDatabase(presentation);
      if (!db) {
        return Effect.succeed([]);
      }

      // The deck's sources, so the folder lists the same slides in the same order (pending ones aside).
      return Effect.succeed(
        get(slideSourcesAtom(presentation))
          .map((source, position) => {
            if (source.kind === 'pending' || source.kind === 'markdown' || !source.slide) {
              return undefined;
            }
            // The node is the Slide, so opening it opens the slide (and its companion assistant has the slide).
            const node = AppNode.makeObject({ get, db, object: source.slide, navigable: true });
            if (!node) {
              return node;
            }

            const title = get(Obj.atomProperty(source.slide, 'title'));
            const label: Translations.Label = title ||
              (source.kind === 'text'
                ? get(Obj.atomProperty(source.text, 'name')) ||
                  firstHeading(get(Obj.atomProperty(source.text, 'content')))
                : Obj.getLabel(source.object)) || [
                'slide-fallback.label',
                { ns: meta.profile.key, count: position + 1 },
              ];
            return { ...node, properties: { ...node.properties, label } };
          })
          .filter(isNonNullable),
      );
    },
  });

/** An owned slide's companion shows the rendered slide beside its editor. */
export const createSlidePreviewExtension = () =>
  AppGraphBuilder.createExtension({
    id: 'slidePreview',
    relation: AppNode.companion,
    // Only a markdown slide has an editor to preview beside.
    match: (node) => {
      const content = Obj.instanceOf(Presentation.Slide, node.data) ? node.data.content.target : undefined;
      return Obj.instanceOf(Presentation.Slide, node.data) && content && Presentation.isOwnedContent(node.data, content)
        ? Option.some(node.data)
        : Option.none();
    },
    connector: () =>
      Effect.succeed([
        AppNode.makeCompanion({
          variant: SlideEditorViewState.COMPANION_VARIANT,
          label: ['slide-preview.label', { ns: meta.profile.key }],
          icon: 'ph--presentation--regular',
          data: SlideEditorViewState.COMPANION_VARIANT,
        }),
      ]),
  });

/** A slide can be hidden from (or shown in) the presentation, from the navtree and the context menu. */
export const createSlideActionsExtension = () =>
  AppGraphBuilder.createExtension({
    id: 'slideActions',
    match: (node) => (Obj.instanceOf(Presentation.Slide, node.data) ? Option.some(node.data) : Option.none()),
    actions: (slide, get) => {
      const hidden = get(Obj.atomProperty(slide, 'hidden')) === true;
      return Effect.succeed([
        {
          id: `${meta.profile.key}.toggle-hidden`,
          data: () =>
            Effect.sync(() =>
              Obj.update(slide, (slide) => {
                slide.hidden = !slide.hidden || undefined;
              }),
            ),
          properties: {
            label: [hidden ? 'show-slide.label' : 'hide-slide.label', { ns: meta.profile.key }],
            icon: hidden ? 'ph--eye--regular' : 'ph--eye-slash--regular',
            disposition: 'list-item',
            testId: 'presenter.toggle-hidden',
          },
        },
      ]);
    },
  });

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const companionExtensions = yield* AppGraphBuilder.createExtension({
      id: 'root',
      relation: AppNode.companion,
      // TODO(wittjosiah): This is a hack to work around presenter previously relying on "variant". Remove.
      match: AppNodeMatcher.whenEchoType(Markdown.Document),
      connector: (object: Markdown.Document) =>
        Effect.succeed([
          AppNode.makeCompanion({
            variant: 'presenter',
            label: 'Presenter',
            icon: 'ph--presentation--regular',
            data: { type: meta.profile.key, object },
          }),
        ]),
      actions: (object: Markdown.Document) => {
        if (!Obj.getDatabase(object)) {
          return Effect.succeed([]);
        }

        return Effect.succeed([
          {
            id: PresenterOperation.SetPresenting.meta.key,
            // The menu item flips, so it reads the current state and states the one it wants.
            data: Effect.fnUntraced(function* () {
              const ephemeral = yield* Capabilities.getAtomValue(DeckCapabilities.EphemeralState);
              yield* Operation.invoke(PresenterOperation.SetPresenting, {
                object,
                state: !isPresenting(ephemeral, object),
              });
            }),
            properties: {
              label: ['toggle-presentation.label', { ns: meta.profile.key }],
              icon: 'ph--presentation--regular',
              disposition: 'list-item',
              testId: 'presenter.present',
              keyBinding: {
                macos: 'shift+meta+p',
                windows: 'shift+alt+p',
              },
            },
          },
        ]);
      },
    });

    const sectionsExtensions = yield* createSectionsExtension();
    const slidePreviewExtensions = yield* createSlidePreviewExtension();
    const slideActionsExtensions = yield* createSlideActionsExtension();

    return Capability.contribute(AppCapabilities.AppGraphBuilder, [
      ...companionExtensions,
      ...sectionsExtensions,
      ...slidePreviewExtensions,
      ...slideActionsExtensions,
    ]);
  }),
);
