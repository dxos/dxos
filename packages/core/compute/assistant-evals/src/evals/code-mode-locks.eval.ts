//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { PlainDialect, makeCodeModeTurnProducer } from '@dxos/agent-code-mode';
import { type MakeTurnProducer } from '@dxos/agent-runtime';
import { Model } from '@dxos/ai';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Database, Filter, Obj, Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

import { createEvalRunner } from '../runner.ts';
import * as Scorer from '../Scorer.ts';

/**
 * A chain of locks, each opened by one operation hidden among hundreds, in skills the agent has to
 * find and enable itself — after the demo where a model worked through a long run of puzzles with
 * thousands of tools at hand.
 *
 * Only the first lock's mechanism is known at the start; opening a lock gives up the key to the next
 * and reveals what that one is. One operation in the whole catalog fits each mechanism, and it opens
 * the lock only with the key the previous lock gave up. So every step is: search the catalog for the
 * mechanism, enable the skill holding that operation, invoke it with the key in hand, read the next
 * mechanism. An engine that pays a model round trip for every lookup and every call shows it here;
 * one that writes the loop once does not.
 */

//
// The catalog: every material × device is an operation, dealt across the makers' skills.
//

/** Add materials (or devices) for a bigger haystack: every pair is one operation. */
const MATERIALS = [
  'brass',
  'bronze',
  'copper',
  'iron',
  'steel',
  'silver',
  'gold',
  'pewter',
  'tin',
  'zinc',
  'nickel',
  'cobalt',
  'titanium',
  'chrome',
  'platinum',
  'lead',
  'oak',
  'walnut',
  'ebony',
  'cedar',
  'maple',
  'birch',
  'ivory',
  'bone',
  'jade',
  'onyx',
  'marble',
  'granite',
  'obsidian',
  'quartz',
  'amber',
  'coral',
  'glass',
  'porcelain',
  'enamel',
  'leather',
  'bamboo',
  'slate',
  'basalt',
  'opal',
] as const;

const DEVICES = [
  'six-pin tumbler',
  'combination dial',
  'disc detainer',
  'warded keyhole',
  'magnetic bolt',
  'rotary cam',
  'push-button keypad',
  'sliding tile puzzle',
  'lever escapement',
  'cipher wheel',
] as const;

/** The skills' makers, whose names say nothing about what their openers fit. */
const MAKERS = [
  'Abernathy',
  'Blackwood',
  'Calloway',
  'Davenport',
  'Ellery',
  'Fairweather',
  'Garrick',
  'Hollis',
  'Ingram',
  'Jessop',
  'Kendrick',
  'Lockhart',
  'Merriweather',
  'Northcott',
  'Ormsby',
  'Pemberton',
  'Quill',
  'Ravenscroft',
  'Sallow',
  'Thackeray',
  'Underhill',
  'Vance',
  'Whitlock',
  'Yarrow',
  'Zeller',
  'Ashdown',
  'Brightwater',
  'Coldridge',
  'Dunmore',
  'Everhart',
  'Fenwick',
  'Greystoke',
  'Harrow',
  'Ironside',
  'Kestrel',
  'Larkspur',
  'Marchbank',
  'Nettleton',
  'Oakhurst',
  'Prendergast',
] as const;

const OPERATIONS_PER_SKILL = 10;

type Material = (typeof MATERIALS)[number];
type Device = (typeof DEVICES)[number];

const mechanismOf = (material: Material, device: Device) => `a ${material} ${device}`;

/** Every mechanism, material-major. */
const MECHANISMS = MATERIALS.flatMap((material) => DEVICES.map((device) => mechanismOf(material, device)));

/**
 * The mechanisms in the order they are dealt to the makers: a fixed stride through the list, coprime
 * with its length, so each maker holds a scatter of materials and devices and no key reveals one.
 */
const DEALT = MECHANISMS.map((_, index) => MECHANISMS[(index * 7_919) % MECHANISMS.length]);

/** A maker's name and key segment; past the list's end a number tells repeats apart. */
const makerOf = (index: number) => {
  const surname = MAKERS[index % MAKERS.length];
  const round = Math.floor(index / MAKERS.length);
  return {
    name: round === 0 ? `${surname} & Co.` : `${surname} & Co. ${round + 1}`,
    segment: `${surname.toLowerCase()}${round === 0 ? '' : round + 1}`,
  };
};

//
// The vault: the locks in order, the key each takes, and the mechanism that opens it.
//

/** The chain, one material and one device apiece, so no two locks share an operation. */
const CHAIN: readonly { name: string; mechanism: string }[] = [
  { name: 'Gatehouse', mechanism: mechanismOf('brass', 'six-pin tumbler') },
  { name: 'Cellar door', mechanism: mechanismOf('walnut', 'warded keyhole') },
  { name: 'Strongroom', mechanism: mechanismOf('cobalt', 'magnetic bolt') },
  { name: 'Inner cage', mechanism: mechanismOf('jade', 'cipher wheel') },
  { name: 'Ledger safe', mechanism: mechanismOf('porcelain', 'combination dial') },
  { name: 'Vault', mechanism: mechanismOf('obsidian', 'lever escapement') },
];

/** What a lock says before the one ahead of it is open. */
const SEALED_MECHANISM = 'unknown until the previous lock is open';

/** Deterministic keys: a fixed linear congruential sequence over letters and digits no one misreads. */
const KEY_ALPHABET = 'ACDEFHJKMNPRTUVWXY3479';
const KEYS: readonly string[] = (() => {
  let state = 0x5eed;
  const next = () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return KEY_ALPHABET[state % KEY_ALPHABET.length];
  };
  return CHAIN.map(() => Array.from({ length: 6 }, next).join(''));
})();

/**
 * The mark a lock carries once an operation opened it. Derived from a salt only the handlers know, so
 * a lock set open by writing the field directly does not count as opened.
 */
const SEAL_SALT = 'locksmith-eval-salt';
const sealFor = (name: string): string => {
  let hash = 0x811c9dc5;
  for (const char of `${SEAL_SALT}:${name}`) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  }
  return hash.toString(16);
};

class Lock extends Type.makeObject<Lock>(DXN.make('com.example.type.lock', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
    /** Where the lock sits in the chain: the first key opens lock 1. */
    order: Schema.Number,
    /** What the lock is: the words that find the one operation that opens it. */
    mechanism: Schema.String,
    opened: Schema.Boolean,
    /** Set by the lock itself when it opens. */
    seal: Schema.optional(Schema.String),
    /** Tries that did not open the lock: a wrong mechanism or a wrong key. */
    misses: Schema.optional(Schema.Number),
  }),
) {}

const LockInput = Schema.Struct({
  lock: Ref.Ref(Lock).annotate({ description: 'The lock to open.' }),
  key: Schema.String.annotate({ description: 'The key: the first one given, or the one the previous lock returned.' }),
});

const LockOutput = Schema.Struct({
  opened: Schema.Boolean,
  next: Schema.optional(Schema.String).annotate({ description: 'The key the opened lock held, for the next lock.' }),
  message: Schema.String,
});

/**
 * One opener: it fits exactly one mechanism, and opens a lock of it only with that lock's key. The
 * lock's true mechanism comes from the chain, not its record, so rewriting the record fits nothing.
 */
const makeOpener = (mechanism: string, key: string) => {
  const definition = Operation.make({
    meta: {
      // Generated: the eval's haystack is hundreds of operations, which no one searches the source for.
      // oxlint-disable-next-line @dxos/rules/operation-key-shape
      key: DXN.make(key),
      // No word every operation shares ("open", "lock"): the Skill Manager's search keeps a row that
      // matches any one query word, so a shared word would return the whole catalog.
      name: `${mechanism[2].toUpperCase()}${mechanism.slice(3)}`,
      description: `Turns ${mechanism} with its key and gives up the key behind it.`,
    },
    input: LockInput,
    output: LockOutput,
    services: [Database.Service],
  }).pipe(Operation.mutation('write'));

  const handler = definition.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ lock: lockRef, key }) {
        const lock = yield* Database.load(lockRef);
        const position = CHAIN.findIndex(({ name }) => name === lock.name);
        const miss = (message: string) =>
          Effect.gen(function* () {
            Obj.update(lock, (lock) => {
              lock.misses = (lock.misses ?? 0) + 1;
            });
            yield* Database.flush();
            return { opened: false, message };
          });
        if (position === -1 || CHAIN[position].mechanism !== mechanism) {
          return yield* miss(`This opener fits only ${mechanism}; it does not fit the ${lock.name}.`);
        }
        if (KEYS[position] !== key) {
          return yield* miss('The key does not turn.');
        }
        const following = CHAIN[position + 1];
        if (!lock.opened) {
          Obj.update(lock, (lock) => {
            lock.opened = true;
            lock.seal = sealFor(lock.name);
          });
          // Opening a lock is what shows the next one's mechanism.
          if (following !== undefined) {
            const locks = yield* Database.query(Filter.type(Lock)).run;
            const nextLock = locks.find(({ name }) => name === following.name);
            if (nextLock !== undefined) {
              Obj.update(nextLock, (nextLock) => {
                nextLock.mechanism = following.mechanism;
              });
            }
          }
          yield* Database.flush();
        }
        return following === undefined
          ? { opened: true, message: `The ${lock.name} is open. It was the last lock.` }
          : {
              opened: true,
              next: KEYS[position + 1],
              message: `The ${lock.name} is open. Its key fits the ${following.name}, which is ${following.mechanism}.`,
            };
      }),
    ),
  );

  return { definition, handler };
};

const SKILLS = Array.from({ length: Math.ceil(DEALT.length / OPERATIONS_PER_SKILL) }, (_, index) => {
  const maker = makerOf(index);
  const skillKey = `com.example.guild.${maker.segment}`;
  const openers = DEALT.slice(index * OPERATIONS_PER_SKILL, (index + 1) * OPERATIONS_PER_SKILL).map((mechanism, slot) =>
    makeOpener(mechanism, `${skillKey}.no${slot + 1}`),
  );
  const operations = openers.map(({ definition }) => definition);
  const definition: Skill.Definition = {
    key: skillKey,
    operations,
    make: () =>
      Skill.make({
        key: skillKey,
        name: maker.name,
        description: `${maker.name}'s mechanisms, ten of them.`,
        instructions: Template.make({ source: 'Each operation turns one mechanism. Pass the lock and its key.' }),
        tools: Skill.toolDefinitions({ operations }),
        agentCanEnable: true,
      }),
  };
  return { definition, handlers: openers.map(({ handler }) => handler) };
});

/**
 * Contributes every locksmith skill and its openers the way a real plugin does: `SkillDefinition`s
 * and an `OperationHandler` set, which RoutinePlugin's registry sync turns into the registry's
 * `Skill` objects and `PersistentOperation` records the Skill Manager searches. None is bound to the
 * run, so the agent has to find and enable each one.
 */
const locksmithPlugin = (): Plugin.Plugin =>
  Plugin.make(
    Plugin.define(Plugin.makeMeta({ key: DXN.make('com.example.plugin.locksmith'), name: 'Locksmith' })).pipe(
      Plugin.addModule({
        id: 'com.example.plugin.locksmith.module.catalog',
        // At startup, so the registry holds the catalog before the agent's first search.
        activatesOn: ActivationEvents.Startup,
        provides: [AppCapabilities.SkillDefinition, Capabilities.OperationHandler],
        activate: () =>
          Effect.succeed([
            Capability.contributeAll(
              AppCapabilities.SkillDefinition,
              SKILLS.map(({ definition }) => definition),
            ),
            Capability.contribute(
              Capabilities.OperationHandler,
              OperationHandlerSet.make(...SKILLS.flatMap(({ handlers }) => handlers)),
            ),
          ]),
      }),
    ),
  )();

//
// The matrix: the same engines and models as `code-mode.eval.ts`.
//

const ENGINES: { name: string; makeTurnProducer?: MakeTurnProducer }[] = [
  { name: 'tools' },
  { name: 'code-mode-effect', makeTurnProducer: makeCodeModeTurnProducer() },
  { name: 'code-mode-plain', makeTurnProducer: makeCodeModeTurnProducer({ dialect: PlainDialect }) },
];

const MODELS: { name: string; model: DXN.DXN }[] = [Model.claudeOpus5, Model.deepseekV4Pro].map((model) => ({
  name: model.backend,
  model: model.id,
}));

/** A comma-separated filter from the environment; unset or empty keeps everything. */
const filterFromEnv = (variable: string): ((name: string) => boolean) => {
  const value = process.env[variable]?.trim() ?? '';
  const selected = value ? value.split(',').map((name) => name.trim()) : [];
  return (name) => selected.length === 0 || selected.includes(name);
};

const engineSelected = filterFromEnv('DX_EVAL_ENGINES');
const modelSelected = filterFromEnv('DX_EVAL_MODELS');

const VARIANTS = ENGINES.filter(({ name }) => engineSelected(name)).flatMap((engine) =>
  MODELS.filter(({ name }) => modelSelected(name)).map(({ name, model }) => ({
    name: `${engine.name} / ${name}`,
    input: {
      model,
      name: `${engine.name} / ${name}`,
      ...(engine.makeTurnProducer ? { makeTurnProducer: engine.makeTurnProducer } : {}),
    },
  })),
);

//
// Grading.
//

/** The locks as the run left them, in chain order; a lock missing from the space is `undefined`. */
const vault = Scorer.shared(
  Database.query(Filter.type(Lock)).run.pipe(
    Effect.map((locks) => ({
      count: locks.length,
      chain: CHAIN.map(({ name }) => locks.find((lock) => lock.name === name)),
    })),
  ),
);

/** Whether an operation opened the lock, rather than a direct write to its fields. */
const openedByOperation = (lock: Lock | undefined): boolean =>
  lock !== undefined && lock.opened && lock.seal === sealFor(lock.name);

const SCORERS: Scorer.Any[] = [
  Scorer.make({
    name: 'locks-opened',
    description: `Share of the ${CHAIN.length} locks an operation opened.`,
    score: vault.pipe(
      Effect.map(({ chain }) => ({
        score: chain.filter(openedByOperation).length / CHAIN.length,
        metadata: { opened: chain.filter(openedByOperation).map((lock) => lock?.name) },
      })),
    ),
  }),
  Scorer.make({
    name: 'vault-opened',
    description: 'The last lock is open: the chain was followed to its end.',
    score: vault.pipe(Effect.map(({ chain }) => openedByOperation(chain.at(-1)))),
  }),
  Scorer.make({
    name: 'no-forced-locks',
    description:
      'Every open lock was opened by its operation, in chain order, and the vault still holds exactly its locks.',
    score: vault.pipe(
      Effect.map(({ count, chain }) => {
        const open = chain.map((lock) => lock?.opened === true);
        const prefix = open.every((isOpen, index) => !isOpen || index === 0 || open[index - 1]);
        return (
          count === CHAIN.length &&
          prefix &&
          chain.every((lock) => lock !== undefined && (!lock.opened || openedByOperation(lock)))
        );
      }),
    ),
  }),
  Scorer.make({
    name: 'wrong-tries',
    description: 'Tries with the wrong opener or key: full marks for none, none at twice the chain length.',
    score: vault.pipe(
      Effect.map(({ chain }) => {
        const misses = chain.reduce((total, lock) => total + (lock?.misses ?? 0), 0);
        return { score: Scorer.withinBudget(misses, 0, CHAIN.length * 2), metadata: { misses } };
      }),
    ),
  }),
  Scorer.toolCallSuccess(),
  Scorer.failedCalls({ budget: 5 }),
  // A lookup, an enable and a call per lock is 18 round trips; a loop does it in a handful.
  Scorer.turns({ target: 6, budget: 40 }),
];

const task = createEvalRunner({
  name: 'Code mode — opens a chain of locks',
  instructions: trim`
    Open every lock in the vault. The locks are in the database, in order; the first key is "${KEYS[0]}".
    Each lock you open gives you the key to the next one.
  `,
  input: Schema.Null,
  output: Schema.Unknown,
  types: [Lock],
  plugins: [locksmithPlugin()],
  timeout: 300_000,
  gradeIncomplete: true,
  scored: true,
  agentSession: true,
  seed: () =>
    Effect.gen(function* () {
      for (const [index, { name, mechanism }] of CHAIN.entries()) {
        yield* Database.add(
          Obj.make(Lock, {
            name,
            order: index + 1,
            mechanism: index === 0 ? mechanism : SEALED_MECHANISM,
            opened: false,
          }),
        );
      }
      yield* Database.flush();
      return {};
    }),
});

evalite.each(VARIANTS)('Code mode — opens a chain of locks', {
  data: [{ input: null }],
  task,
  // The reply as text: evalite's reporter throws on wide characters inside an object it renders.
  columns: ({ output }) => [
    {
      label: 'Reply',
      value: typeof output.agentOutput === 'string' ? output.agentOutput : JSON.stringify(output.agentOutput),
    },
    { label: 'Seconds', value: String(Math.round(output.durationMillis / 1_000)) },
  ],
  scorers: Scorer.toEvalite(SCORERS),
});
