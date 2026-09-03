//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { Config } from '@dxos/config';
import { type Type } from '@dxos/echo';
import { SpacesService } from '@dxos/protocols/rpc';

import * as SampleSpace from '../sample/SampleSpace';

/**
 * Ephemeral in-process client, torn down when the enclosing scope closes.
 *
 * An explicit empty `Config` (no `dataRoot`/`sqlitePath`, no signaling, no edge url) makes
 * `createLocalClientServices` resolve to in-memory SQLite and an in-process swarm — nothing is
 * written to disk and no network connection is ever attempted.
 */
export const ephemeralClient = Effect.gen(function* () {
  const testBuilder = new TestBuilder(new Config());
  const client = new Client({ services: testBuilder.createLocalClientServices() });
  yield* Effect.promise(() => client.initialize());
  yield* Effect.addFinalizer(() => Effect.promise(() => client.destroy()));
  return client;
});

export type SampleSpaceArchive<A> = {
  /** Whatever the definition's recipe returned, for assertions and reporting. */
  readonly result: A;
  /**
   * The archive as a single line of JSON. Committed snapshots are stored one-line so a rebuild
   * produces a one-line diff rather than thousands of changed lines; `jq .` inspects it.
   */
  readonly json: string;
  readonly objectCount: number;
};

/**
 * Builds a sample space headlessly and exports it as a JSON archive: no live client, no network.
 * Drop the archive into Composer (`client.spaces.import(...)`) to get the content as real data.
 */
export const buildArchive = <Phases extends SampleSpace.PhaseMap, A>(
  definition: SampleSpace.Definition<Phases, A>,
  options: {
    readonly identity?: string;
    /** Extra types to register beyond those the definition's phases declare. */
    readonly schemas?: ReadonlyArray<Type.AnyEntity>;
  } = {},
): Effect.Effect<SampleSpaceArchive<A>, SampleSpace.SampleSpaceError> =>
  Effect.gen(function* () {
    const client = yield* ephemeralClient;
    yield* Effect.promise(() =>
      client.halo.createIdentity({ displayName: options.identity ?? `${definition.space.name} builder` }),
    );
    yield* Effect.promise(() => client.addTypes([...definition.schemas, ...(options.schemas ?? [])]));

    const space = yield* Effect.promise(() => client.spaces.create(definition.space));
    yield* Effect.promise(() => space.waitUntilReady());

    const result = yield* SampleSpace.applyTo(definition, space);

    const archive = yield* Effect.promise(() =>
      space.internal.export({ format: SpacesService.SpaceArchiveFormat.enums.JSON }),
    );
    const parsed = JSON.parse(new TextDecoder().decode(archive.contents));
    return { result, json: JSON.stringify(parsed), objectCount: parsed.objects.length };
  }).pipe(Effect.scoped);

/**
 * Object count per typename, for asserting a rebuilt snapshot still carries what it used to.
 *
 * Counts the archive's feed messages alongside its database objects — an archive keeps them in
 * separate sections, and a phase that authors a mailbox or a calendar puts most of its content in
 * the feeds one.
 */
export const histogram = (json: string): Record<string, number> => {
  const archive: {
    objects?: Array<{ '@type'?: string }>;
    feeds?: Array<{ messages?: Array<{ '@type'?: string }> }>;
  } = JSON.parse(json);
  const entities = [...(archive.objects ?? []), ...(archive.feeds ?? []).flatMap((feed) => feed.messages ?? [])];

  return entities.reduce<Record<string, number>>((counts, entity) => {
    const type = entity['@type'] ?? 'unknown';
    counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, {});
};
