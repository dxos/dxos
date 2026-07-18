//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
// Explicit imports so the emitted `.d.ts` references the packages via their public
// aliases instead of relative `node_modules` paths (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { GraphBuilder } from '@dxos/app-graph';
import { AppCapabilities, AppSpace } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationInvoker } from '@dxos/operation';
import { Graph, Node } from '@dxos/plugin-graph';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';

// Raw import keeps the welcome copy in a standalone Markdown file that renders in editors and diffs cleanly.
import README_CONTENT from '../content/readme.md?raw';
import { OnboardingOperation } from '../operations';
import { type OnboardingOptions } from './capabilities';

const PERSONAL_SPACE_ICON = 'house-line';
const PERSONAL_SPACE_ICON_HUE = 'violet';

export const README_DOCUMENT_NAME = 'README';

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ generateExemplarSpace }: OnboardingOptions) {
    const { Annotation, Obj, Ref } = yield* Effect.tryPromise(() => import('@dxos/echo'));
    const { ClientCapabilities } = yield* Effect.tryPromise(() => import('@dxos/plugin-client'));
    const { Markdown } = yield* Effect.tryPromise(() => import('@dxos/plugin-markdown'));
    const {
      AppAnnotation: { RootCollectionAnnotation },
    } = yield* Effect.tryPromise(() => import('@dxos/app-toolkit'));

    const operationInvoker = yield* Capabilities.OperationInvoker;
    const { graph } = yield* AppCapabilities.AppGraph;
    const client = yield* ClientCapabilities.Client;
    const personalSpace = yield* SpaceCapabilities.PersonalSpace;

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
      const welcomeDoc = Markdown.make({ name: README_DOCUMENT_NAME, content: README_CONTENT });
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

    return [];
  }),
);
