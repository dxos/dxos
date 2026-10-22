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

import { slideSourcesAtom } from '#deck';
import { meta } from '#meta';
import { Presentation, PresenterOperation } from '#types';

import { isPresenting } from '../paths.ts';

const HEADING = /^#{1,6}[ \t]+(.+?)[ \t#]*$/;
const FENCE = /^[ \t]{0,3}(`{3,}|~{3,})/;

/** First markdown heading of the content, skipping fenced code blocks so `# comment` in code is not a title. */
export const firstHeading = (content: string): string | undefined => {
  let fence: string | undefined;
  for (const line of content.split('\n')) {
    const marker = line.match(FENCE)?.[1];
    if (fence) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) {
        fence = undefined;
      }
      continue;
    }
    if (marker) {
      fence = marker;
      continue;
    }
    const heading = line.match(HEADING)?.[1];
    if (heading) {
      return heading;
    }
  }
  return undefined;
};

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
            if (source.kind === 'pending') {
              return undefined;
            }
            const object = source.kind === 'text' ? source.text : source.object;
            const node = AppNode.makeObject({ get, db, object, navigable: true });
            if (!node || source.kind !== 'text') {
              return node;
            }

            const label: Translations.Label = get(Obj.atomProperty(source.text, 'name')) ||
              firstHeading(get(Obj.atomProperty(source.text, 'content'))) || [
                'slide-fallback.label',
                { ns: meta.profile.key, count: position + 1 },
              ];
            return { ...node, properties: { ...node.properties, label } };
          })
          .filter(isNonNullable),
      );
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

    return Capability.contribute(AppCapabilities.AppGraphBuilder, [...companionExtensions, ...sectionsExtensions]);
  }),
);
