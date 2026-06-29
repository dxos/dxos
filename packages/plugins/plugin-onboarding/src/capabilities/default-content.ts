//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppCapabilities, AppSpace } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Graph, Node } from '@dxos/plugin-graph';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';

import { OnboardingOperation } from '../operations';
import { type OnboardingOptions } from './capabilities';

const PERSONAL_SPACE_ICON = 'house-line';
const PERSONAL_SPACE_ICON_HUE = 'violet';

const WELCOME_DOCUMENT_NAME = 'Welcome to Composer';

const WELCOME_CONTENT = `# Welcome to Composer

Composer is a **local-first workspace** — documents, tables, sketches, inboxes, and more, all in one place and all yours. Your data lives on your device and syncs directly to collaborators without going through a server.

## Getting started

- **Create something** — use the **+** button in the sidebar to add a document, table, sketch, or any other content type.
- **Invite someone** — click **Share** in the top bar to invite a collaborator to this space. You'll edit together in real time.
- **Install plugins** — open **Settings** to add more content types (kanban boards, spreadsheets, calendars, and more).

## This is your Personal space

Everything in this space is private to you until you choose to share it. Create spaces for teams, projects, or topics — each with its own members and content.

---

Questions or feedback? Join the community on [Discord](https://dxos.org/discord) or browse the [documentation](https://docs.dxos.org).
`;

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ generateExemplarSpace }: OnboardingOptions) {
    const { Annotation, Obj, Ref } = yield* Effect.tryPromise(() => import('@dxos/echo'));
    const { ClientCapabilities } = yield* Effect.tryPromise(() => import('@dxos/plugin-client'));
    const { Markdown } = yield* Effect.tryPromise(() => import('@dxos/plugin-markdown'));
    const {
      AppAnnotation: { RootCollectionAnnotation },
      AppSpace: { getPersonalSpace },
    } = yield* Effect.tryPromise(() => import('@dxos/app-toolkit'));

    const operationInvoker = yield* Capability.get(Capabilities.OperationInvoker);
    const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
    const client = yield* Capability.get(ClientCapabilities.Client);

    const personalSpace = getPersonalSpace(client);
    if (!personalSpace) {
      return Capability.contributes(Capabilities.Null, null);
    }
    Obj.update(personalSpace.properties, (obj) => {
      obj.icon = PERSONAL_SPACE_ICON;
      obj.iconHue = PERSONAL_SPACE_ICON_HUE;
    });

    // Run plugin OnCreateSpace callbacks against the personal space so capabilities that
    // depend on a fresh space (e.g. skills) wire themselves up. The exemplar space
    // gets the same callbacks via the regular SpaceCreated event on import.
    yield* Plugin.activate(SpaceEvents.SpaceCreated);
    const personalRootCollection = Option.getOrUndefined(
      Annotation.get(personalSpace.properties, RootCollectionAnnotation),
    )?.target;
    if (personalRootCollection) {
      const onCreateSpaceCallbacks = yield* Capability.getAll(SpaceCapabilities.OnCreateSpace);
      yield* Effect.all(
        onCreateSpaceCallbacks.map((onCreateSpace) =>
          onCreateSpace({ space: personalSpace, isDefault: true, rootCollection: personalRootCollection }).pipe(
            Effect.provideService(Operation.Service, operationInvoker),
          ),
        ),
      );

      // Add a welcome document to the personal space root collection.
      const welcomeDoc = Markdown.make({ name: WELCOME_DOCUMENT_NAME, content: WELCOME_CONTENT });
      personalSpace.db.add(welcomeDoc);
      Obj.update(personalRootCollection, (personalRootCollection) => {
        personalRootCollection.objects.push(Ref.make(welcomeDoc));
      });
    }

    if (generateExemplarSpace) {
      yield* Effect.promise(() => operationInvoker.invokePromise(OnboardingOperation.ImportExemplarSpace, {}));

      // Eagerly expand the graph so the exemplar space's content is visible in the navtree
      // as soon as the user opens it, without waiting for a lazy expansion pass.
      const exemplarSpace = client.spaces.get().find((space) => space.tags.includes(AppSpace.EXEMPLAR_SPACE_TAG));
      graph.pipe(Graph.expand(Node.RootId, 'child'), Graph.expand(personalSpace.id, 'child'));
      if (exemplarSpace) {
        graph.pipe(Graph.expand(exemplarSpace.id, 'child'));
      }
    } else {
      graph.pipe(Graph.expand(Node.RootId, 'child'), Graph.expand(personalSpace.id, 'child'));
    }
  }),
);
