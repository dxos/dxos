//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { Stage } from '@dxos/pipeline';
import {
  DEFAULT_INDEX_BATCH_SIZE,
  FactStore,
  FactStoreUnsupportedError,
  RDF,
  hashText,
  indexFactsBatch,
} from '@dxos/pipeline-rdf';

import * as AgentRegistry from '../AgentRegistry.ts';
import { type StateError } from '../errors.ts';
import * as StateStore from '../StateStore.ts';
import type * as Type from '../types.ts';

export type ExtractFactsOptions = {
  /** Source namespace used to build each message's fact `source` DXN (default 'discord'). */
  readonly sourceNamespace?: string;
  /** Extra extraction rules appended to the pipeline defaults (domain-specific LLM guidance). */
  readonly rules?: readonly string[];
  /**
   * Messages extracted together in one model request (default 25, one Discord page). `1` extracts each message on
   * its own, as a single-document request.
   */
  readonly batchSize?: number;
};

type MessageEvent = Extract<Type.Event, { readonly _tag: 'Message' }>;

/** Every user the registry knows as a known entity, keyed by source user id: their IRI, display name and usernames. */
const knownUsers = (profiles: readonly AgentRegistry.Profile[]): Map<string, RDF.KnownEntity> =>
  new Map(
    profiles.flatMap((profile) => {
      const user = AgentRegistry.userOf(profile);
      if (!user) {
        return [];
      }
      const usernames = AgentRegistry.usernamesOf(profile);
      const entity: RDF.KnownEntity = {
        iri: AgentRegistry.iriForUser(user),
        label: profile.label ?? usernames[0] ?? user.id,
        aliases: usernames,
        type: 'person',
      };
      return [[user.id, entity] as const];
    }),
  );

/** Discord's `<@id>` / `<@!id>` mentions as `@name`, so the model reads a person it can link instead of an opaque id. */
const resolveMentions = (text: string, users: ReadonlyMap<string, RDF.KnownEntity>): string =>
  text.replace(/<@!?(\d+)>/g, (mention, id: string) => {
    const user = users.get(id);
    return user ? `@${user.label}` : mention;
  });

/** Time on the profile graph, fixed so re-extraction rewrites the same graph rather than minting another. */
const PROFILE_TIME = new Date(0).toISOString();

/**
 * The facts naming a user from the source's own metadata, in one graph per version of the profile, superseding the
 * user's earlier profile graphs: `user —is a→ schema:Person` and
 * `user —has account→ "username"`, the subject carrying the display name, so the user's label comes from the source, never from a mention.
 */
const profileFacts = (profile: AgentRegistry.Profile, supersedes: readonly string[] = []): RDF.Fact[] => {
  const user = AgentRegistry.userOf(profile);
  if (!user) {
    return [];
  }
  const iri = AgentRegistry.iriForUser(user);
  const usernames = AgentRegistry.usernamesOf(profile);
  const label = profile.label ?? usernames[0] ?? user.id;
  const hash = hashText(`${label}\n${usernames.join('\n')}`);
  const subject: RDF.EntityTerm = { kind: 'entity', entity: iri, label, type: 'person' };
  const statement = (predicate: string, object: RDF.Term): RDF.Fact => ({
    id: '',
    assertion: { subject, predicate, object },
    factuality: { value: 'CT+', polarity: '+' },
    attribution: { agent: iri, agentLabel: label, source: iri, generatedAtTime: PROFILE_TIME },
    recordedAt: PROFILE_TIME,
    extractor: { id: 'agent-registry', model: `${user.source}-profile`, version: '1' },
    sourceHash: hash,
    ...(supersedes.length > 0 ? { supersedes: [...supersedes] } : {}),
  });
  return RDF.Graph.assign(
    [
      statement('is a', { kind: 'entity', entity: 'https://schema.org/Person', label: 'Person' }),
      ...usernames.map((username) => statement('has account', { kind: 'literal', literal: username })),
    ],
    // One graph per version of the profile, so a changed one supersedes the last instead of adding to it.
    { name: () => `${iri}#profile-${hash}` },
  );
};

const isExtractable = (event: Type.Event): event is MessageEvent =>
  event._tag === 'Message' && event.message.text.trim().length > 0;

/**
 * Batched stage: groups up to `batchSize` extractable messages (other events ride along, in order), resolves each
 * message's author to a canonical agent, and extracts the batch's facts in one pipeline-rdf request per transcript.
 * Each fact's `source` is its message's DXN and `author` the agent's canonical token. Every event passes through
 * unchanged and in order, and only after its batch is extracted, so the commit sink advances each target's cursor
 * per message as before. A failed batch is recorded on every target it touched and its events still pass. The
 * pipeline's per-source hash cursor makes re-ingest idempotent: an unchanged message never reaches the model again.
 */
export const extractFactsStage = (
  options?: ExtractFactsOptions,
): Stage.Stage<
  Type.Event,
  Type.Event,
  StateError,
  AgentRegistry.AgentRegistry | FactStore | AiService.AiService | StateStore.StateStore
> => {
  const namespace = options?.sourceNamespace ?? 'discord';
  const extractOptions = options?.rules ? { rules: options.rules } : {};
  const extract = Effect.fnUntraced(function* (events: readonly MessageEvent[]) {
    const authors = new Map<string, AgentRegistry.Profile>();
    for (const event of events) {
      const agent = yield* AgentRegistry.resolve(
        AgentRegistry.identifiersForUser(event.message.author),
        AgentRegistry.labelForUser(event.message.author),
      );
      authors.set(event.message.id, agent);
    }
    const users = knownUsers(yield* AgentRegistry.list());
    const docs = events.map((event): RDF.ExtractDocument => {
      const user = event.message.author;
      return {
        text: resolveMentions(event.message.text, users),
        source: `${namespace}:${event.message.id}`,
        // The model reads people by name; attribution and links use the user's IRI.
        author: authors.get(event.message.id)?.label ?? AgentRegistry.labelForUser(user) ?? user.id,
        agent: AgentRegistry.iriForUser(user),
        date: event.message.createdAt,
      };
    });
    yield* indexFactsBatch(docs, { ...extractOptions, entities: [...users.values()] });
    // A profile is rewritten only when it changed: an append-only store (an ECHO fact feed) would grow on every batch.
    const store = yield* FactStore;
    for (const profile of new Set(authors.values())) {
      const [first] = profileFacts(profile);
      if (first && (yield* store.cursor(first.attribution.source)) !== first.sourceHash) {
        // A write-only store (an ECHO fact feed) cannot be read back, so its profile graphs supersede nothing; any other
        // failure propagates, so the profile is not written without superseding the one it replaces.
        const earlier = (yield* store.query({ source: first.attribution.source }).pipe(
          Effect.catchIf(
            (error): error is FactStoreUnsupportedError => error instanceof FactStoreUnsupportedError,
            (): Effect.Effect<RDF.Fact[]> => Effect.succeed([]),
          ),
        ))
          .filter((fact) => fact.extractor.id === first.extractor.id)
          .map((fact) => RDF.Mapping.graphOf(fact));
        yield* store.putFacts(profileFacts(profile, [...new Set(earlier)]));
        yield* store.setCursor(first.attribution.source, first.sourceHash);
      }
    }
  });

  return Stage.batch(
    'extract-facts',
    {
      size: options?.batchSize ?? DEFAULT_INDEX_BATCH_SIZE,
      weight: (event: Type.Event) => (isExtractable(event) ? 1 : 0),
    },
    (events: readonly Type.Event[]) => {
      const messages = events.filter(isExtractable);
      return (messages.length === 0 ? Effect.void : extract(messages)).pipe(
        Effect.catch((error) =>
          Effect.forEach(
            // One record per target the batch touched, so the failure is visible wherever its messages came from.
            [...new Map(messages.map(({ target }) => [target.id, target])).values()],
            (target) =>
              StateStore.setStatus(
                target.id,
                target.status,
                `extract-facts: ${error instanceof Error ? error.message : String(error)}`,
              ),
            { discard: true },
          ),
        ),
        Effect.as(events),
      );
    },
  );
};
