//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppCapabilities, EXEMPLAR_SPACE_TAG } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Graph, Node } from '@dxos/plugin-graph';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';
import { SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';

import EXEMPLAR_SPACE_JSON from '../content/exemplar-space.dx.json?raw';
import { type OnboardingOptions } from './capabilities';

const PERSONAL_SPACE_ICON = 'house-line';
const PERSONAL_SPACE_ICON_HUE = 'violet';
const EXEMPLAR_SPACE_ARCHIVE_FILENAME = 'exemplar-space.dx.json';

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ generateExemplarSpace }: OnboardingOptions) {
    const { Annotation, Collection, Obj, Type } = yield* Effect.tryPromise(() => import('@dxos/echo'));
    const { MigrationVersionAnnotation, Migrations } = yield* Effect.tryPromise(() => import('@dxos/migrations'));
    const { ClientCapabilities } = yield* Effect.tryPromise(() => import('@dxos/plugin-client'));
    const { RootCollectionAnnotation, getPersonalSpace } = yield* Effect.tryPromise(() => import('@dxos/app-toolkit'));

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
    // depend on a fresh space (e.g. blueprints) wire themselves up. The exemplar space
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
    }

    if (generateExemplarSpace) {
      // Import the bundled Bramble Coffee Roasters exemplar space on first launch.
      // The immutable EXEMPLAR_SPACE_TAG guards re-import — if a space with that tag already
      // exists we use it as-is, even if the user has renamed or partially deleted content.
      const existingExemplar = client.spaces.get().find((space) => space.tags.includes(EXEMPLAR_SPACE_TAG));
      const exemplarSpace =
        existingExemplar ??
        (yield* Effect.tryPromise(async () => {
          const archive: SpaceArchive = {
            filename: EXEMPLAR_SPACE_ARCHIVE_FILENAME,
            contents: new TextEncoder().encode(EXEMPLAR_SPACE_JSON),
            format: SpaceArchive.Format.JSON,
          };
          return client.spaces.import(archive, { tags: [EXEMPLAR_SPACE_TAG] });
        }));
      yield* Effect.tryPromise(() => exemplarSpace!.waitUntilReady());

      // Stamp the migration version so the exemplar space is treated as already migrated,
      // the same way create.ts and identity-created.ts do for newly created spaces.
      if (Migrations.targetVersion) {
        Obj.update(exemplarSpace.properties, (properties) => {
          Annotation.set(properties, MigrationVersionAnnotation, Migrations.targetVersion!);
        });
      }

      // Eagerly expand the graph so the exemplar space's content is visible in the navtree
      // as soon as the user opens it, without waiting for a lazy expansion pass.
      graph.pipe(
        Graph.expand(Node.RootId, 'child'),
        Graph.expand(personalSpace.id, 'child'),
        Graph.expand(exemplarSpace.id, 'child'),
      );
    } else {
      graph.pipe(Graph.expand(Node.RootId, 'child'), Graph.expand(personalSpace.id, 'child'));
    }
  }),
);
