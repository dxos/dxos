//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { type RDF } from '@dxos/pipeline-rdf';

import { BrainService, Goal, Knowledge, MemoryOperation, Profile } from '#types';

import { canonicalKey, expandKeys, identityGroups } from './identity.ts';
import { entityKeys, knownIdentities, spaceFacts } from './knowledge.ts';

/** The names of the facts' sources that are objects in the space (documents); a chat message is a feed item, so has none. */
const sourceNames = Effect.fnUntraced(function* (facts: readonly RDF.Fact[]) {
  const names = new Map<string, string>();
  for (const uri of new Set(facts.map(({ attribution }) => attribution.source))) {
    const eid = EID.tryParse(uri);
    const id = eid && EID.getEntityId(eid);
    const [object] = id ? yield* Database.query(Filter.id(id)).run : [];
    const label = object && Obj.getLabel(object);
    if (label) {
      names.set(uri, label);
    }
  }
  return names;
});

/** Words, split the same way for a query and the text it searches; `#` and `@` stay, so handles and refs match. */
const words = (text: string | undefined): string[] =>
  (text ?? '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}#@]+/u)
    .filter((word) => word.length > 0);

/** Whether every query word starts a word of the text: "migration" finds "migrations", "Ann" does not find "Joanne". */
const matches = (text: string, query: readonly string[]): boolean => {
  const textWords = words(text);
  return query.every((word) => textWords.some((textWord) => textWord.startsWith(word)));
};

const handler: Operation.WithHandler<typeof MemoryOperation.Recall> = MemoryOperation.Recall.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, query, limit }) {
      const entity = subject ? yield* Database.load(subject) : undefined;
      const allFacts = yield* spaceFacts;
      // The subject's own keys, widened to the entities strong identifiers tie it to (its Discord account, its email
      // address), which facts from other sources were minted under.
      const groups = identityGroups(allFacts, yield* knownIdentities);
      const ownKeys = entity ? entityKeys(entity) : undefined;
      const ids = ownKeys ? new Set([...ownKeys, ...expandKeys(ownKeys, groups)]) : undefined;
      const isSubjectKey = (key: string): boolean => ids !== undefined && (ids.has(key) || ids.has(canonicalKey(key)));
      const activeMemories = Knowledge.fromFacts(allFacts)
        .filter((memory) => memory.status === 'active' && (!ids || Knowledge.isAbout(memory, ids)))
        .sort(Knowledge.byNewest);

      // Expired facts stay in the brain as history; recall leaves them out. Memories are listed as memories.
      const now = new Date().toISOString();
      const subjectFacts = allFacts
        .filter((fact) => fact.kind === undefined)
        .filter((fact) => !fact.assertion.validTo || fact.assertion.validTo > now)
        .filter((fact) => {
          if (!ids) {
            return true;
          }
          const { subject, object } = fact.assertion;
          const entities = [subject, object].flatMap((term) => (term.kind === 'entity' ? [term.entity] : []));
          return [...entities, fact.attribution.agent].some((id) => id !== undefined && isSubjectKey(id));
        })
        .sort((left, right) => right.attribution.generatedAtTime.localeCompare(left.attribution.generatedAtTime));

      const queryWords = words(query);
      const matchedMemories = activeMemories.filter((memory) => matches(memory.content, queryWords));
      const matchedFacts = subjectFacts.filter((fact) =>
        matches(`${BrainService.factText(fact)} ${fact.assertion.quote ?? ''}`, queryWords),
      );
      // A query rarely uses the words a fact was stored with ("location" for "is in Bangkok"): when it matches
      // nothing, everything about the subject is the better answer than none.
      const queryMatched = queryWords.length === 0 || matchedMemories.length > 0 || matchedFacts.length > 0;
      const memories = (queryMatched ? matchedMemories : activeMemories).slice(0, limit ?? undefined);
      const facts = (queryMatched ? matchedFacts : subjectFacts).slice(0, limit ?? undefined);
      const names = yield* sourceNames(facts);

      const goals = (yield* Database.query(Filter.type(Goal.Goal)).run)
        .filter(Profile.isLiveGoal)
        .filter((goal) => !entity || goal.owners.some((owner) => Profile.refersTo(owner, entity.id)));

      return {
        ...(queryMatched ? {} : { queryMatched: false }),
        memories: memories.map((memory) => ({
          memory: memory.id,
          content: memory.content,
          kind: memory.kind,
          origin: memory.origin,
          observedAt: memory.observedAt,
          ...(memory.source ? { source: memory.source } : {}),
        })),
        facts: facts.map((fact) => ({
          fact: BrainService.factText(fact),
          ...(fact.assertion.quote ? { quote: fact.assertion.quote } : {}),
          ...((fact.attribution.agentLabel ?? fact.attribution.agent)
            ? { speaker: fact.attribution.agentLabel ?? fact.attribution.agent }
            : {}),
          source: fact.attribution.source,
          ...(names.has(fact.attribution.source) ? { sourceName: names.get(fact.attribution.source) } : {}),
          saidAt: fact.attribution.generatedAtTime,
        })),
        goals: goals.map((goal) => ({
          goal: Ref.make(goal),
          title: goal.title,
          horizon: goal.horizon,
          status: goal.status,
        })),
      };
    }),
  ),
);

export default handler;
