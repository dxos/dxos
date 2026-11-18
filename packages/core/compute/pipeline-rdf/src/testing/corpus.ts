//
// Copyright 2026 DXOS.org
//

import { type EntityKind, type Fact, type FactualityValue, Graph, type Term, termValue } from '../types/index.ts';

//
// A deterministic, inbox-shaped fact corpus: no AI, no credentials, stable across runs. It exists so a view can
// be built and judged at the scale a mailbox actually produces — a handful of hand-authored facts proves nothing
// about a surface whose whole job is to stay readable over thousands.
//

/** Mulberry32: a small seeded generator, so a story and a test see the same corpus every run. */
const random = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type Named = { readonly id: string; readonly label: string; readonly type: EntityKind };

/** A list with at least one element, so drawing from it is a value rather than a maybe. */
type NonEmpty<T> = readonly [T, ...T[]];

/** The element at `index`, wrapping; the head stands in for an index no arithmetic here can actually produce. */
const wrap = <T>(values: NonEmpty<T>, index: number): T => {
  const [head] = values;
  return values[((index % values.length) + values.length) % values.length] ?? head;
};

/** A fixture entity by id. The throw means the lists below changed under something that names one of them. */
const byId = (values: NonEmpty<Named>, id: string): Named => {
  const found = values.find((value) => value.id === id);
  if (!found) {
    throw new Error(`Fixture entity not found: ${id}`);
  }
  return found;
};

const named = (label: string, type: EntityKind): Named => ({
  id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  label,
  type,
});

/** Keeps the list non-empty through the map, which would otherwise widen it to an array. */
const namedList = (type: EntityKind, [first, ...rest]: NonEmpty<string>): NonEmpty<Named> => [
  named(first, type),
  ...rest.map((label) => named(label, type)),
];

const PEOPLE: NonEmpty<Named> = namedList('person', [
  'Alice Chen',
  'Bob Mehta',
  'Carol Dubois',
  'Dan Okafor',
  'Erin Walsh',
  'Felix Braun',
  'Grace Lim',
  'Hugo Marchand',
  'Ida Sorensen',
  'Jonas Weber',
  'Kira Novak',
  'Liam Doyle',
  'Maya Rao',
  'Noah Fischer',
  'Olivia Costa',
  'Priya Nair',
]);

const ORGS: NonEmpty<Named> = namedList('org', [
  'DXOS',
  'Blueyard',
  'Protocol Labs',
  'Northwind',
  'Helios Capital',
  'Acme Robotics',
  'Meridian Health',
  'Castalia',
]);

const PROJECTS: NonEmpty<Named> = namedList('thing', [
  'Composer',
  'Edge Worker',
  'Fact Store',
  'Semantic Index',
  'Transcription Pipeline',
  'Inbox Triage',
  'Design System',
  'Billing Migration',
  'Mobile Shell',
  'Replication Audit',
]);

const PLACES: NonEmpty<Named> = namedList('place', ['Berlin', 'Lisbon', 'London', 'New York', 'Zurich', 'Singapore']);

const EVENTS: NonEmpty<Named> = namedList('event', [
  'Q3 Board Meeting',
  'Protocol Summit',
  'Design Review',
  'Offsite',
  'Investor Update',
]);

const ROLES: NonEmpty<string> = ['Engineering Lead', 'Designer', 'Researcher', 'CTO', 'Operations', 'Analyst'];

/**
 * The statement shapes the generator draws from. Surface forms are wordings the seed ontology resolves (so the
 * overview groups several wordings onto one predicate), plus two it does not — those are minted in the brain's
 * namespace, which is what an extractor does with a verb the vocabulary has no name for.
 */
type Template = {
  readonly predicate: string;
  readonly subject: NonEmpty<Named>;
  readonly object: NonEmpty<Named> | 'role';
  readonly weight: number;
};

const TEMPLATES: NonEmpty<Template> = [
  { predicate: 'works at', subject: PEOPLE, object: ORGS, weight: 8 },
  { predicate: 'employed by', subject: PEOPLE, object: ORGS, weight: 3 },
  { predicate: 'is on the team', subject: PEOPLE, object: ORGS, weight: 3 },
  { predicate: 'has role', subject: PEOPLE, object: 'role', weight: 5 },
  { predicate: 'knows', subject: PEOPLE, object: PEOPLE, weight: 6 },
  { predicate: 'works on', subject: PEOPLE, object: PROJECTS, weight: 9 },
  { predicate: 'depends on', subject: PROJECTS, object: PROJECTS, weight: 4 },
  { predicate: 'part of', subject: PROJECTS, object: PROJECTS, weight: 3 },
  { predicate: 'located in', subject: ORGS, object: PLACES, weight: 4 },
  { predicate: 'located in', subject: EVENTS, object: PLACES, weight: 3 },
  { predicate: 'mentions', subject: EVENTS, object: PROJECTS, weight: 4 },
  { predicate: 'proposes', subject: PEOPLE, object: PROJECTS, weight: 3 },
  { predicate: 'completed', subject: PEOPLE, object: PROJECTS, weight: 3 },
  { predicate: 'shipped', subject: PEOPLE, object: PROJECTS, weight: 2 },
  { predicate: 'awaiting', subject: PEOPLE, object: PROJECTS, weight: 3 },
  // Not in the seed vocabulary: minted from the surface form, as an extraction would.
  { predicate: 'introduced', subject: PEOPLE, object: PEOPLE, weight: 2 },
  { predicate: 'reviewed', subject: PEOPLE, object: PROJECTS, weight: 2 },
];

/** Factuality mix: mostly plain assertions, with hedged, denied and uncommitted facts in realistic proportion. */
const FACTUALITY: NonEmpty<{ value: FactualityValue; weight: number }> = [
  { value: 'CT+', weight: 68 },
  { value: 'PR+', weight: 16 },
  { value: 'PS+', weight: 8 },
  { value: 'CT-', weight: 4 },
  { value: 'PR-', weight: 2 },
  { value: 'Uu', weight: 2 },
];

const QUOTES: NonEmpty<string> = [
  'Confirmed on the call this morning.',
  'See the thread below for the details.',
  'I think this is right but check with the team.',
  'As discussed, this is now settled.',
  'Not sure about the timing yet.',
  'Can you confirm this before Friday?',
];

export type CorpusOptions = {
  /** Source messages to extract from; each yields one to four facts. */
  readonly messages?: number;
  readonly seed?: number;
  /** The day the newest message lands on; the corpus runs back from it. */
  readonly until?: string;
  /** Days the messages are spread over. */
  readonly days?: number;
};

const EXTRACTOR = { id: 'corpus', model: 'ai.claude.model.claude-haiku-4-5', version: '1' };

const pick = <T>(next: () => number, values: NonEmpty<T>): T => wrap(values, Math.floor(next() * values.length));

const weighted = <T extends { weight: number }>(next: () => number, values: NonEmpty<T>): T => {
  const total = values.reduce((sum, value) => sum + value.weight, 0);
  let roll = next() * total;
  for (const value of values) {
    roll -= value.weight;
    if (roll <= 0) {
      return value;
    }
  }
  // Reached only when the weights sum short of the roll through float error; the last value is the one it meant.
  return wrap(values, values.length - 1);
};

const entityTerm = (entity: Named): Term => ({
  kind: 'entity',
  entity: entity.id,
  label: entity.label,
  type: entity.type,
});

/**
 * An inbox-shaped corpus of facts. Deliberately uneven: a few people and projects carry most of the statements,
 * the predicate mix is long-tailed, and some claims contradict each other across senders — which is what makes an
 * overview worth looking at and a conflict worth finding.
 */
export const generateCorpus = ({
  messages = 400,
  seed = 1,
  until = '2026-11-01T00:00:00.000Z',
  days = 180,
}: CorpusOptions = {}): Fact[] => {
  const next = random(seed);
  const end = Date.parse(until);
  const facts: Fact[] = [];

  // A skewed draw: the first few names are mentioned far more often than the rest, as in a real mailbox.
  const skewed = <T>(values: NonEmpty<T>): T => wrap(values, Math.floor(values.length * next() ** 2.2));

  for (let message = 0; message < messages; message++) {
    const author = skewed(PEOPLE);
    const source = `dxn:gmail:msg-${String(message).padStart(4, '0')}`;
    const at = new Date(end - Math.floor(next() * days * 24 * 60 * 60 * 1000)).toISOString();
    const count = 1 + Math.floor(next() * 4);

    for (let index = 0; index < count; index++) {
      const template = weighted(next, TEMPLATES);
      const subject = skewed(template.subject);
      const object: Term =
        template.object === 'role'
          ? { kind: 'literal', literal: pick(next, ROLES) }
          : entityTerm(skewed(template.object));
      // A fact about a thing and itself says nothing; redraw it as a plain mention instead.
      if (object.kind === 'entity' && object.entity === subject.id) {
        continue;
      }

      const { value } = weighted(next, FACTUALITY);
      const uncommitted = value === 'Uu';
      facts.push({
        id: `c-${message}-${index}`,
        assertion: {
          subject: entityTerm(subject),
          predicate: template.predicate,
          object,
          ...(next() < 0.45 ? { quote: pick(next, QUOTES) } : {}),
        },
        factuality: {
          value,
          polarity: value.endsWith('-') ? '-' : '+',
          confidence: Math.round((0.45 + next() * 0.54) * 100) / 100,
          nature: next() < 0.8 ? 'epistemic' : 'aleatory',
        },
        // An uncommitted proposition is a question: the author asserts nothing by asking it.
        ...(uncommitted ? { illocution: { force: 'directive', mood: 'interrogative' } } : {}),
        attribution: { agent: author.id, agentLabel: author.label, source, generatedAtTime: at },
        recordedAt: at,
        extractor: EXTRACTOR,
        sourceHash: `h-${message}`,
      });
    }
  }

  return [...facts, ...conflicts(end)];
};

/**
 * Claims that contradict each other: the same subject and predicate, different objects, different senders and
 * days. Append-only storage keeps them all, and resolving them is a query-time concern — so a view has to show
 * them rather than pick one.
 */
const conflicts = (end: number): Fact[] => {
  const cases: ReadonlyArray<[Named, string, Named, Named]> = [
    [byId(PEOPLE, 'alice-chen'), 'works at', byId(ORGS, 'dxos'), byId(ORGS, 'blueyard')],
    [byId(PEOPLE, 'bob-mehta'), 'works on', byId(PROJECTS, 'composer'), byId(PROJECTS, 'edge-worker')],
    [byId(EVENTS, 'q3-board-meeting'), 'located in', byId(PLACES, 'berlin'), byId(PLACES, 'london')],
  ];
  return cases.flatMap(([subject, predicate, first, second], index) =>
    [first, second].map((object, side): Fact => {
      const author = wrap(PEOPLE, index + side + 2);
      const at = new Date(end - (side + 1) * 36 * 60 * 60 * 1000).toISOString();
      return {
        id: `x-${index}-${side}`,
        assertion: {
          subject: entityTerm(subject),
          predicate,
          object: entityTerm(object),
          quote:
            side === 0
              ? `${subject.label} is with ${object.label}, as of this week.`
              : `Correction — it is ${object.label}, not the other one.`,
        },
        factuality: { value: side === 0 ? 'PR+' : 'CT+', polarity: '+', confidence: side === 0 ? 0.55 : 0.92 },
        attribution: {
          agent: author.id,
          agentLabel: author.label,
          source: `dxn:gmail:conflict-${index}-${side}`,
          generatedAtTime: at,
        },
        recordedAt: at,
        extractor: EXTRACTOR,
        sourceHash: `x-${index}-${side}`,
      };
    }),
  );
};

/** The corpus the stories seed with, generated once so every story in a session shows the same facts. */
export const DEMO_CORPUS: Fact[] = generateCorpus();

//
// The held-out split behind the "facts are memory for new mail" demo: build the store from older mail, then ask
// what it already knows about the entities in a message it has never seen.
//

/** A message kept out of the store, with the facts an extraction found in it — the answer key. */
export type IncomingMessage = {
  readonly source: string;
  readonly from: string;
  readonly fromLabel: string;
  readonly receivedAt: string;
  /** Prose assembled from the facts' quotes; the corpus is synthetic, so this stands in for the real body. */
  readonly body: string;
  readonly facts: Fact[];
};

/** The display form of a term: the surface label where the extraction kept one, else the key. */
const termLabel = (term: Term): string => (term.kind === 'entity' ? (term.label ?? term.entity) : term.literal);

/** A readable body for a synthetic message: the quotes it carries, then a sentence for each remaining fact. */
const bodyOf = (facts: readonly Fact[]): string => {
  const sentences = facts.map((fact) => {
    const { subject, predicate, object, quote } = fact.assertion;
    return quote ?? `${termLabel(subject)} ${predicate} ${termLabel(object)}.`;
  });
  return [...new Set(sentences)].join(' ');
};

export type SplitOptions = {
  /** How many of the newest messages to hold out. */
  readonly holdOut?: number;
};

/**
 * Split a corpus in time: the facts of the oldest messages go into the store, and the newest messages are held
 * out. Splitting by **message** rather than by fact is the point — a fact from a held-out message must not leak
 * into the store, or the demo would be testing recall of something it was told.
 */
export const splitCorpus = (
  facts: readonly Fact[],
  { holdOut = 3 }: SplitOptions = {},
): { prior: Fact[]; incoming: IncomingMessage[] } => {
  const bySource = new Map<string, Fact[]>();
  for (const fact of facts) {
    const list = bySource.get(fact.attribution.source) ?? [];
    list.push(fact);
    bySource.set(fact.attribution.source, list);
  }

  // Newest message last; a message's time is the latest of its facts.
  const timeOf = (group: readonly Fact[]) =>
    Math.max(...group.map((fact) => Date.parse(fact.attribution.generatedAtTime)));
  const ordered = [...bySource.entries()].sort(([, left], [, right]) => timeOf(left) - timeOf(right));
  const cut = Math.max(0, ordered.length - Math.max(0, Math.trunc(holdOut)));

  return {
    prior: ordered.slice(0, cut).flatMap(([, group]) => group),
    incoming: ordered.slice(cut).map(([source, group]) => {
      const [first] = group;
      return {
        source,
        from: first?.attribution.agent ?? 'unknown',
        fromLabel: first?.attribution.agentLabel ?? first?.attribution.agent ?? 'Unknown',
        receivedAt: new Date(timeOf(group)).toISOString(),
        body: bodyOf(group),
        facts: group,
      };
    }),
  };
};

/** The entity keys a message's facts mention, deduped, in the order they first appear. */
export const entitiesInMessage = (message: IncomingMessage): Array<{ key: string; label: string }> => {
  const seen = new Map<string, string>();
  for (const fact of message.facts) {
    for (const term of [fact.assertion.subject, fact.assertion.object]) {
      if (term.kind === 'entity' && !seen.has(term.entity)) {
        seen.set(term.entity, term.label ?? term.entity);
      }
    }
  }
  return [...seen.entries()].map(([key, label]) => ({ key, label }));
};

//
// The scripted case behind the retraction demo: an agent that learned something wrong from a stale thread, and
// the correction a later message supports. Scripted rather than drawn from the generator, because the point is a
// claim a viewer can follow by name — and because the demo has to be the same every time it is shown.
//

export type BeliefDemo = {
  /** The question put to the store, in words. */
  readonly question: string;
  /** Entity key of the subject the question is about. */
  readonly subject: string;
  /** The predicate, as a surface form the ontology resolves. */
  readonly predicate: string;
  /** What the agent extracted from the mailbox, stale claim included. */
  readonly prior: Fact[];
  /** The stale claim, so a demo can point at the thing it is about to correct. */
  readonly stale: Fact;
  /** The correction a later message supports. Not in `prior`: applying it is the demo's third beat. */
  readonly correction: Fact;
};

// Named rather than indexed: the demo's beats depend on WHICH entity each one is, not on a position.
const BELIEF_SUBJECT = byId(PEOPLE, 'hugo-marchand');
const BELIEF_WRONG = byId(ORGS, 'helios-capital');
const BELIEF_RIGHT = byId(ORGS, 'dxos');
const BELIEF_STALE_AUTHOR = byId(PEOPLE, 'alice-chen');
const BELIEF_CORRECTING_AUTHOR = byId(PEOPLE, 'bob-mehta');

const beliefFact = (
  id: string,
  object: Named,
  author: Named,
  over: { value: FactualityValue; confidence: number; at: string; source: string; quote: string },
): Fact => ({
  id,
  assertion: {
    subject: entityTerm(BELIEF_SUBJECT),
    predicate: 'works at',
    object: entityTerm(object),
    quote: over.quote,
  },
  factuality: { value: over.value, polarity: '+', confidence: over.confidence, nature: 'epistemic' },
  attribution: {
    agent: author.id,
    agentLabel: author.label,
    source: over.source,
    generatedAtTime: over.at,
  },
  recordedAt: over.at,
  extractor: EXTRACTOR,
  sourceHash: id,
});

/**
 * The demo, over the generated corpus plus one planted claim. The stale claim is hedged (`PR+`) and old, the
 * correction is certain (`CT+`), newer and from someone else — so the two differ on every axis the store records,
 * and a viewer can see why one replaces the other rather than being told.
 */
export const beliefDemo = (options: CorpusOptions = {}): BeliefDemo => {
  const stale = beliefFact('belief-stale', BELIEF_WRONG, BELIEF_STALE_AUTHOR, {
    value: 'PR+',
    confidence: 0.58,
    at: '2026-05-30T09:00:00.000Z',
    source: 'dxn:gmail:msg-0092',
    quote: `I think ${BELIEF_SUBJECT.label} is at ${BELIEF_WRONG.label} now — he mentioned it a while back.`,
  });
  const correction = Graph.supersede(
    beliefFact('belief-correction', BELIEF_RIGHT, BELIEF_CORRECTING_AUTHOR, {
      value: 'CT+',
      confidence: 0.96,
      at: '2026-10-27T14:00:00.000Z',
      source: 'dxn:gmail:msg-0135',
      quote: `Correction — ${BELIEF_SUBJECT.label} joined ${BELIEF_RIGHT.label} in September. ${BELIEF_WRONG.label} was two jobs ago.`,
    }),
    stale,
  );

  // The generator also writes about this person, and an unscripted `works at` of its own would answer the
  // question before the demo does. Everything it says about them as a SUBJECT is dropped, so the two scripted
  // claims are the only answers; they stay in the corpus as an object, which is what keeps the store realistic.
  const prior = generateCorpus(options).filter((fact) => termValue(fact.assertion.subject) !== BELIEF_SUBJECT.id);

  return {
    question: `Where does ${BELIEF_SUBJECT.label} work?`,
    subject: BELIEF_SUBJECT.id,
    predicate: 'works at',
    prior: [...prior, stale],
    stale,
    correction,
  };
};
