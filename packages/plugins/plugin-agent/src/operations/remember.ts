//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { EntityId } from '@dxos/keys';
import { RDF } from '@dxos/pipeline-rdf';
import { Organization, Person } from '@dxos/types';

import { AgentPresence, BrainService, MemoryOperation, Profile } from '#types';

import { AgentOperationError } from './errors.ts';
import { recordingAgent } from './knowledge.ts';
import { agentId } from './members.ts';

const entityType = (entity: Obj.Unknown): RDF.EntityKind | undefined =>
  Obj.instanceOf(Person.Person, entity)
    ? 'person'
    : Obj.instanceOf(Organization.Organization, entity)
      ? 'org'
      : undefined;

const entityTerm = (entity: Obj.Unknown): RDF.EntityTerm => {
  const type = entityType(entity);
  return { kind: 'entity', entity: Obj.getURI(entity), label: Profile.displayName(entity), ...(type ? { type } : {}) };
};

/**
 * A fresh graph IRI per fact, so a correction replaces that fact alone. An entity id rather than a hash of the
 * provenance, whose time would give every run a different id: the model reads it back, and tests pin entity ids.
 */
const makeGraph = (): string => RDF.Vocab.graphIri(`fact-${EntityId.random()}`).value;

const handler: Operation.WithHandler<typeof MemoryOperation.Remember> = MemoryOperation.Remember.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef, facts: recorded, source }) {
      if (recorded.length === 0) {
        return yield* Effect.fail(new AgentOperationError({ message: 'Record at least one fact.' }));
      }
      for (const { predicate, object, value, confidence } of recorded) {
        if ((object === undefined) === (value === undefined)) {
          return yield* Effect.fail(
            new AgentOperationError({ message: 'Each fact needs exactly one of object (an entity) or value.' }),
          );
        }
        if (MemoryOperation.isProsePredicate(predicate)) {
          return yield* Effect.fail(
            new AgentOperationError({
              message: `"${predicate}" holds prose, not a relation: state the fact with a predicate that relates the subject to its object.`,
            }),
          );
        }
        if (confidence !== undefined && (confidence < 0 || confidence > 1)) {
          return yield* Effect.fail(new AgentOperationError({ message: 'Confidence must be between 0 and 1.' }));
        }
      }

      const agent = yield* recordingAgent(agentRef);
      const speaker = agentId(agent);
      // A predicate outside the seed vocabulary is minted where extraction mints it, so both share it.
      const ontology = RDF.Ontology.DEFAULT.withNamespace(RDF.Vocab.brainNamespace(AgentPresence.brainId(agent)));
      const now = new Date().toISOString();
      const facts = yield* Effect.forEach(
        recorded,
        Effect.fnUntraced(function* (fact) {
          const subject = yield* Database.load(fact.subject);
          const object = fact.object ? entityTerm(yield* Database.load(fact.object)) : undefined;
          const entry = ontology.resolve(fact.predicate);
          const origin = fact.origin ?? 'stated';
          return {
            id: '',
            graph: makeGraph(),
            assertion: {
              subject: entityTerm(subject),
              predicate: entry.label,
              predicateIri: entry.iri,
              ...(fact.predicateDescription ? { predicateDescription: fact.predicateDescription } : {}),
              object: object ?? { kind: 'literal', literal: fact.value ?? '' },
              ...(fact.quote ? { quote: fact.quote } : {}),
            },
            // What a person stated is certain; what the agent concluded is probable.
            factuality: {
              value: origin === 'stated' ? 'CT+' : 'PR+',
              polarity: '+',
              ...(fact.confidence !== undefined ? { confidence: fact.confidence } : {}),
            },
            attribution: {
              agent: speaker,
              agentLabel: agent.name,
              source: source?.uri ?? speaker,
              generatedAtTime: now,
            },
            recordedAt: now,
            extractor: { id: 'remember', model: 'agent', version: '2' },
            sourceHash: now,
            origin,
            ...(fact.supersedes?.length ? { supersedes: [...fact.supersedes] } : {}),
          } satisfies RDF.Fact;
        }),
      );
      const placed = RDF.Graph.assign(facts, { ontology });

      // The agent's own words, so a watch never wakes on what it recorded.
      yield* (yield* BrainService.BrainService).push(AgentPresence.brainId(agent), placed, { quiet: [speaker] });
      return { facts: placed.map(RDF.Mapping.graphOf) };
    }),
  ),
);

export default handler;
