//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { type Entity, type LighthouseClient } from '#client';
import { Finding, LighthouseCapabilities, type LighthouseOperation, type Research } from '#types';

import { LighthouseNoClientError, LighthouseNotConnectedError, ResearchNotStartedError } from '../errors.ts';
import { getEndpoint } from '../util/endpoint.ts';

/** The client for the Research's connection, from the registered factory that handles its URL. */
export const loadClient = Effect.fnUntraced(function* (research: Research.Research) {
  if (!research.connection) {
    return yield* Effect.fail(new LighthouseNotConnectedError());
  }
  const connection = yield* Database.load(research.connection);
  if (!connection.accessToken) {
    return yield* Effect.fail(new LighthouseNotConnectedError());
  }
  const accessToken = yield* Database.load(connection.accessToken);
  const endpoint = getEndpoint(accessToken);
  const factories = yield* Capability.getAll(LighthouseCapabilities.ClientFactory);
  const factory = factories.find((candidate) => candidate.match(endpoint.url));
  if (!factory) {
    return yield* Effect.fail(new LighthouseNoClientError({ context: { url: endpoint.url } }));
  }
  return factory.make(endpoint) satisfies LighthouseClient;
});

/** The Research's run, failing when the session has not started. */
export const requireRun = (research: Research.Research) =>
  research.run ? Effect.succeed(research.run) : Effect.fail(new ResearchNotStartedError());

/** Runs a feed effect against the Research's own database. */
const inDatabase = <A, E>(research: Research.Research, effect: Effect.Effect<A, E, Database.Service>) => {
  const db = Obj.getDatabase(research);
  invariant(db, 'Research is not in a space.');
  return effect.pipe(Effect.provide(Database.layer(db)));
};

/** Every Finding in the Research's feed, oldest first. */
export const queryFindings = Effect.fnUntraced(function* (research: Research.Research) {
  const feed = yield* Database.load(research.feed);
  return yield* inDatabase(research, Feed.query(feed, Filter.type(Finding.Finding)).run);
});

/** Appends Findings to the Research's feed. */
export const appendFindings = Effect.fnUntraced(function* (research: Research.Research, findings: Finding.Finding[]) {
  if (findings.length === 0) {
    return;
  }
  const feed = yield* Database.load(research.feed);
  yield* inDatabase(research, Feed.append(feed, findings).pipe(Effect.provideService(Database.Origin, 'system')));
});

/** A Finding from the article's copy of a result, with the provenance lighthouse reports for it when it can. */
export const toFinding = (
  input: LighthouseOperation.FindingInput,
  keptBy: Finding.KeptBy,
  entity?: Entity,
): Finding.Finding =>
  Finding.make({
    iri: input.iri,
    title: input.title,
    ...(input.url ? { url: input.url } : {}),
    types: [...(entity?.types ?? input.types)],
    images: [...input.images],
    properties: Object.fromEntries(
      Object.entries(entity?.props ?? input.properties).map(([key, values]) => [key, [...values]]),
    ),
    provenance: (entity?.provenance ?? []).map(({ extractor, source, at }) => ({
      extractor,
      at,
      ...(source ? { source } : {}),
    })),
    ...(input.score !== undefined ? { score: input.score } : {}),
    ...(input.why ? { why: input.why } : {}),
    keptBy,
    keptAt: new Date().toISOString(),
  });
