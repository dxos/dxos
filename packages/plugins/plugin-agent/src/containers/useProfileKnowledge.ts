//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { RDF } from '@dxos/pipeline-rdf';
import { type Organization, type Person } from '@dxos/types';

import { type ProfileFact } from '#components';
import { BrainService, Goal, Profile, TriggerOperation } from '#types';

import { entityKeys, isAbout } from '../operations/knowledge.ts';
import { pollDelay } from './pollDelay.ts';

/** How often the brains are re-read; neither brain has a change feed for its facts. */
const POLL_MS = 3_000;

/**
 * The facts every agent in the space holds, re-read while mounted; an agent with a chat running on EDGE keeps its
 * brain there, so it is read there.
 */
const useSpaceFacts = (db: ReturnType<typeof Obj.getDatabase>): RDF.Fact[] => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const agents = useQuery(db, Filter.type(Agent.Agent));
  const chats = useQuery(db, Filter.type(Chat.Chat));
  const remote = useMemo(
    () =>
      new Set(
        chats.flatMap((chat) => {
          const parent = Obj.getParent(chat);
          return parent && Agent.chatLocation(chat) === 'edge' ? [parent.id] : [];
        }),
      ),
    [chats],
  );

  const [facts, setFacts] = useState<RDF.Fact[]>([]);
  useEffect(() => {
    if (!db) {
      return;
    }
    let cancelled = false;
    let failures = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    // Each read schedules the next once it settles, so a slow call never overlaps (or overwrites) a newer one.
    const read = async () => {
      const results = await Promise.all(
        agents.map((agent) =>
          invokePromise(
            TriggerOperation.InspectBrain,
            { agent: Ref.make(agent) },
            { spaceId: db.spaceId, ...(remote.has(agent.id) ? { on: 'edge' as const } : {}) },
          ),
        ),
      );
      if (cancelled) {
        return;
      }
      setFacts(results.flatMap(({ data }) => data?.facts ?? []));
      failures = results.some(({ error }) => error) ? failures + 1 : 0;
      timeout = setTimeout(() => void read(), pollDelay(POLL_MS, failures));
    };
    void read();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [db, agents, remote, invokePromise]);

  return facts;
};

/** The live goals and the facts agents hold about a person or organization, newest first. */
export const useProfileKnowledge = (
  subject: Person.Person | Organization.Organization,
): { goals: Goal.Goal[]; facts: ProfileFact[] } => {
  const db = Obj.getDatabase(subject);
  const facts = useSpaceFacts(db);
  const allGoals = useQuery(db, Filter.type(Goal.Goal));

  const profileFacts = useMemo(() => {
    const keys = entityKeys(subject);
    // Two agents reading one source store the same fact; it is listed once.
    const unique = [
      ...new Map(BrainService.currentFacts(facts, new Date().toISOString()).map((fact) => [fact.id, fact])).values(),
    ];
    return unique
      .filter((fact) => isAbout(fact, keys))
      .sort((left, right) => right.attribution.generatedAtTime.localeCompare(left.attribution.generatedAtTime))
      .map((fact): ProfileFact => ({
        id: fact.id,
        text: BrainService.factText(fact),
        predicate: RDF.Ontology.DEFAULT.canonical(RDF.Mapping.predicateOf(fact))?.label ?? fact.assertion.predicate,
        ...(fact.origin === 'stated' || fact.origin === 'inferred' ? { origin: fact.origin } : {}),
        saidAt: fact.attribution.generatedAtTime,
      }));
  }, [facts, subject]);

  // A query re-emits on membership only, so status changes (confirmed, dropped) need per-object subscriptions.
  const goalsAtom = useMemo(
    () =>
      Atom.make((get) => {
        allGoals.forEach((goal) => get(Obj.atom(goal)));
        return allGoals.filter(
          (goal) => Profile.isLiveGoal(goal) && goal.owners.some((owner) => Profile.refersTo(owner, subject.id)),
        );
      }),
    [allGoals, subject.id],
  );
  return { goals: useAtomValue(goalsAtom), facts: profileFacts };
};
