//
// Copyright 2026 DXOS.org
//

import * as Tool from 'effect/ai/Tool';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';

import { projectFunctionToTool } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Obj } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

import type { Dialect, SandboxOperation, SandboxType } from './Dialect.ts';

//
// The Discovery skill: in discovery mode the one skill a code-mode prompt states. Everything else the model can use
// (skills, their operations, types) it looks up through these operations, from inside `eval`.
//

export const DISCOVERY_SKILL_KEY = 'org.dxos.skill.discovery';

const SkillRow = Schema.Struct({
  key: Schema.String.annotate({ description: 'What `loadSkill` takes.' }),
  name: Schema.String,
  description: Schema.optional(Schema.String),
  enabled: Schema.Boolean.annotate({
    description: 'Whether the skill is enabled in this conversation; loading one that is not enables it.',
  }),
});

const OperationRow = Schema.Struct({
  key: Schema.String.annotate({ description: 'The operation key, or the name of a tool no operation backs.' }),
  name: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  skill: Schema.optional(Schema.String).annotate({ description: 'Key of the skill that provides it.' }),
  callable: Schema.Boolean.annotate({
    description: 'Whether code can call it now, which it can once its skill is enabled.',
  }),
  call: Schema.optional(Schema.String).annotate({
    description: 'The code that calls it; given when looked up by key.',
  }),
  input: Schema.optional(Schema.String).annotate({ description: 'The input it takes; given when looked up by key.' }),
});

interface OperationRow extends Schema.Schema.Type<typeof OperationRow> {}

const TypeRow = Schema.Struct({
  typename: Schema.String,
  dxn: Schema.String,
  kind: Schema.Literals(['object', 'relation']),
  fields: Schema.optional(Schema.String).annotate({ description: 'Its fields; given when looked up by typename.' }),
});

export const LoadSkill = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.discovery.loadSkill'),
    name: 'Load skill',
    description:
      "Without a key, lists the skills you can use. With one, returns that skill's instructions and operations, " +
      'enabling it in this conversation if it is not yet.',
  },
  input: Schema.Struct({
    key: Schema.optional(Schema.String).annotate({ description: 'The skill to load, as `loadSkill()` lists it.' }),
  }),
  output: Schema.Struct({
    skills: Schema.optional(Schema.Array(SkillRow)),
    skill: Schema.optional(
      Schema.Struct({
        key: Schema.String,
        name: Schema.String,
        instructions: Schema.String,
        operations: Schema.Array(OperationRow),
        enabledNow: Schema.optional(Schema.Boolean).annotate({
          description: 'Enabled by this call: its operations can be called from your next eval call.',
        }),
      }),
    ),
  }),
});

export const QueryOperations = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.discovery.queryOperations'),
    name: 'Query operations',
    description:
      'Searches the operations of the skills you can use. With `keys`, returns each one in full: ' +
      'its input and the code that calls it.',
  },
  input: Schema.Struct({
    query: Schema.optional(Schema.String).annotate({ description: 'Words describing what the operation does.' }),
    skill: Schema.optional(Schema.String).annotate({ description: "Only this skill's operations." }),
    keys: Schema.optional(Schema.Array(Schema.String)).annotate({ description: 'Operations to return in full.' }),
  }),
  output: Schema.Struct({ operations: Schema.Array(OperationRow) }),
});

export const QueryTypes = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.discovery.queryTypes'),
    name: 'Query types',
    description: 'Searches the registered types. With `typenames`, returns their fields.',
  },
  input: Schema.Struct({
    query: Schema.optional(Schema.String).annotate({ description: 'Words in the type or field names.' }),
    typenames: Schema.optional(Schema.Array(Schema.String)).annotate({
      description: 'Types to return with their fields, by typename or DXN.',
    }),
  }),
  output: Schema.Struct({ types: Schema.Array(TypeRow) }),
});

export const DISCOVERY_OPERATIONS = [LoadSkill, QueryOperations, QueryTypes] as const;

const INSTRUCTIONS = trim`
  Nothing about this workspace is listed in this prompt. Its skills, their operations and its types are found with
  the three operations below, which code calls like any other.

  - \`loadSkill()\` lists the skills you can use: those enabled in this conversation, and those you may enable. An
    enabled skill carries the rules for its part of the work, so at the start of a request load each one the request
    touches with \`loadSkill({ key })\`, and follow its instructions. Loading a skill that is not enabled enables it;
    its operations can be called from your next eval call.
  - \`queryOperations({ query })\` searches those skills' operations by what they do; \`queryOperations({ skill })\`
    lists one skill's. A row says whether you can call it now. Look an operation up with
    \`queryOperations({ keys: [key] })\` before calling it: that gives its input and the code that calls it.
  - \`queryTypes({ query })\` searches the registered types; \`queryTypes({ typenames: [typename] })\` gives their
    fields.

  Find what a request needs in one eval call that prints it, then do the work in the next.
`;

/** The Discovery skill: the one skill a discovery-mode prompt states. */
export const makeDiscoverySkill = (): Skill.Skill =>
  Skill.make({
    key: DISCOVERY_SKILL_KEY,
    name: 'Discovery',
    description: 'Finds the skills, operations and types this conversation can use.',
    instructions: Template.make({ source: INSTRUCTIONS }),
    tools: Skill.toolDefinitions({ operations: DISCOVERY_OPERATIONS }),
  });

//
// Serving the skill's operations from what a turn knows.
//

/** What the Discovery skill's operations answer from, gathered by the turn. */
export type DiscoveryContext = {
  readonly dialect: Dialect;
  /** The skills enabled in this conversation. */
  readonly enabled: readonly Skill.Skill[];
  /** What code can call now: the enabled skills' operations and the conversation's MCP tools. */
  readonly operations: readonly SandboxOperation[];
  readonly types: readonly SandboxType[];
  /** Read only when asked: every skill in the registry, and every operation it records. */
  readonly catalog: Effect.Effect<Catalog>;
  /** A skill's instructions, as the prompt would render them. */
  readonly instructionsOf: (skill: Skill.Skill) => Effect.Effect<string>;
  /** Enables a registry skill in this conversation, from the next model call on. */
  readonly enable: (skill: Skill.Skill) => Effect.Effect<void>;
};

/** The registry's skills and operation records. */
export type Catalog = {
  readonly skills: readonly Skill.Skill[];
  readonly records: readonly Operation.PersistentOperation[];
};

/** The Discovery skill for one model call, and its operations as code calls them. */
export type Discovery = {
  readonly skill: Skill.Skill;
  /** Answered by the turn itself, not by a host's handlers; see {@link serveLocally}. */
  readonly operations: readonly SandboxOperation[];
};

export const makeDiscovery = (context: DiscoveryContext): Discovery => {
  const keys = new Set(DISCOVERY_OPERATIONS.map((operation) => String(operation.meta.key)));
  // The skill's own operations are in the prompt, so they are never a search result.
  const usable = context.operations.filter(
    (operation) => operation.definition === undefined || !keys.has(String(operation.definition.meta.key)),
  );

  const loadSkill = ({ key }: { readonly key?: string }) =>
    Effect.gen(function* () {
      const catalog = yield* context.catalog;
      const enableable = enableableSkills(context.enabled, catalog.skills);
      if (key === undefined) {
        return {
          skills: [
            ...context.enabled.map((skill) => skillRow(skill, true)),
            ...enableable.map((skill) => skillRow(skill, false)),
          ],
        };
      }
      const enabled = context.enabled.find((skill) => sameKey(skillKey(skill), key));
      const skill = enabled ?? enableable.find((candidate) => sameKey(skillKey(candidate), key));
      if (skill === undefined) {
        return yield* Effect.die(new Error(`No skill ${key} can be used here; loadSkill() lists the ones that can.`));
      }
      if (enabled === undefined) {
        yield* context.enable(skill);
      }
      const operations = operationRows(context.enabled, usable, enableable, catalog.records)
        .filter((row) => row.skill === skillKey(skill))
        .map(({ row }) => brief(row));
      return {
        skill: {
          key: skillKey(skill),
          name: skill.name,
          instructions: yield* context.instructionsOf(skill),
          operations,
          ...(enabled === undefined ? { enabledNow: true } : {}),
        },
      };
    });

  const queryOperations = ({
    query,
    skill,
    keys: wanted,
  }: {
    readonly query?: string;
    readonly skill?: string;
    readonly keys?: readonly string[];
  }) =>
    Effect.gen(function* () {
      const catalog = yield* context.catalog;
      const enableable = enableableSkills(context.enabled, catalog.skills);
      const rows = operationRows(context.enabled, usable, enableable, catalog.records).filter(
        (row) => skill === undefined || (row.skill !== undefined && sameKey(row.skill, skill)),
      );
      if (wanted !== undefined) {
        return {
          operations: rows
            .filter(({ row }) => wanted.some((key) => sameKey(row.key, key) || row.name === key))
            .map(({ row, operation }) => ({
              ...row,
              ...(operation === undefined ? {} : context.dialect.signature(operation)),
            })),
        };
      }
      return {
        operations: ranked(rows, query, ({ row }) => [row.key, row.name, row.description, row.skill]).map(({ row }) =>
          brief(row),
        ),
      };
    });

  const queryTypes = ({ query, typenames }: { readonly query?: string; readonly typenames?: readonly string[] }) =>
    Effect.succeed({
      types:
        typenames === undefined
          ? ranked(context.types, query, (type) => [type.typename, ...type.fields.map(({ name }) => name)]).map(typeRow)
          : context.types
              .filter((type) => typenames.includes(type.typename) || typenames.includes(type.dxn))
              .map((type) => ({
                ...typeRow(type),
                fields: type.fields
                  .map(({ name, type, optional }) => `${name}${optional ? '?' : ''}: ${type}`)
                  .join(', '),
              })),
    });

  return {
    skill: makeDiscoverySkill(),
    operations: [serve(LoadSkill, loadSkill), serve(QueryOperations, queryOperations), serve(QueryTypes, queryTypes)],
  };
};

/**
 * `service`, answering the given operations itself. The Effect dialect calls an operation through
 * `Operation.invoke`, which reaches a host's handlers; an operation the turn serves has none there.
 */
export const serveLocally = (
  service: Operation.OperationService,
  operations: readonly SandboxOperation[],
): Operation.OperationService => {
  const local = new Map(
    operations.flatMap((operation) =>
      operation.definition === undefined ? [] : [[String(operation.definition.meta.key), operation] as const],
    ),
  );
  const run = <I, O>(op: Operation.Definition<I, O>, input: unknown): Effect.Effect<O> | undefined =>
    local
      .get(String(op.meta.key))
      ?.invoke(input)
      .pipe(
        Effect.flatMap((output) => outputOf(op, output)),
        Effect.orDie,
      );
  return {
    invoke: (op, ...args) => run(op, args[0]) ?? service.invoke(op, ...args),
    schedule: (op, ...args) => run(op, args[0])?.pipe(Effect.exit, Effect.asVoid) ?? service.schedule(op, ...args),
    invokePromise: (op, ...args) => {
      const effect = run(op, args[0]);
      return effect === undefined
        ? service.invokePromise(op, ...args)
        : Effect.runPromiseExit(effect).then((exit) =>
            Exit.isSuccess(exit) ? { data: exit.value } : { error: asError(Cause.squash(exit.cause)) },
          );
    },
  };
};

/** One of the skill's operations as code calls it, decoding its input as `Operation.invoke` would. */
const serve = <I, O>(
  definition: Operation.Definition<I, O>,
  handler: (input: I) => Effect.Effect<O>,
): SandboxOperation => ({
  name: Operation.toolName(definition),
  description: definition.meta.description,
  parameters: Tool.getJsonSchema(projectFunctionToTool(definition)),
  definition,
  invoke: (input) =>
    Schema.decodeUnknownEffect(Schema.toType(definition.input))(input ?? {}).pipe(
      Effect.orDie,
      Effect.flatMap(handler),
    ),
});

/** The output typed as the definition says, checked rather than asserted. */
const outputOf = <I, O>(op: Operation.Definition<I, O>, output: unknown) => {
  const type = Schema.toType(op.output);
  return Schema.is(type)(output) ? Effect.succeed(output) : Schema.decodeUnknownEffect(type)(output);
};

const asError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)));

/** A skill's key, or for a space-authored skill with none its URI. */
const skillKey = (skill: Skill.Skill): string => Obj.getMeta(skill).key ?? String(Obj.getURI(skill));

/** Keys compare with or without the `dxn:` prefix, since records and definitions spell them differently. */
const sameKey = (left: string, right: string): boolean => bare(left) === bare(right);
const bare = (key: string): string => key.replace(/^dxn:/, '');

/** The registry's skills an agent may enable here, and has not. */
const enableableSkills = (enabled: readonly Skill.Skill[], skills: readonly Skill.Skill[]): Skill.Skill[] =>
  skills.filter(
    (skill) => skill.agentCanEnable === true && !enabled.some((other) => sameKey(skillKey(other), skillKey(skill))),
  );

const skillRow = (skill: Skill.Skill, enabled: boolean) => ({
  key: skillKey(skill),
  name: skill.name,
  ...(skill.description === undefined ? {} : { description: summary(String(skill.description)) }),
  enabled,
});

const typeRow = ({ typename, dxn, kind }: SandboxType) => ({ typename, dxn, kind });

/** A row, with the operation behind it when code can call it. */
type Candidate = { readonly row: OperationRow; readonly skill?: string; readonly operation?: SandboxOperation };

/**
 * Every operation the model can use: the enabled skills' (callable), the conversation's other tools (callable), and
 * those of the skills it may enable (callable once enabled), each once.
 */
const operationRows = (
  enabled: readonly Skill.Skill[],
  usable: readonly SandboxOperation[],
  enableable: readonly Skill.Skill[],
  records: readonly Operation.PersistentOperation[],
): Candidate[] => {
  const byName = new Map(usable.map((operation) => [operation.name, operation] as const));
  const recordsByName = new Map(
    records.flatMap((record) => {
      const key = Operation.getKey(record);
      const name = key === undefined ? undefined : Operation.tryToolNameFromKey(key);
      return name === undefined ? [] : [[name, record] as const];
    }),
  );
  const rows = new Map<string, Candidate>();
  const add = (candidate: Candidate) => {
    if (!rows.has(bare(candidate.row.key))) {
      rows.set(bare(candidate.row.key), candidate);
    }
  };
  const callable = (operation: SandboxOperation, skill?: string): Candidate => ({
    row: {
      key: operation.definition === undefined ? operation.name : String(operation.definition.meta.key),
      ...(operation.definition?.meta.name === undefined ? {} : { name: operation.definition.meta.name }),
      ...(operation.description === undefined ? {} : { description: operation.description }),
      ...(skill === undefined ? {} : { skill }),
      callable: true,
    },
    skill,
    operation,
  });
  for (const skill of enabled) {
    for (const tool of skill.tools) {
      const operation = byName.get(String(tool));
      if (operation !== undefined) {
        add(callable(operation, skillKey(skill)));
      }
    }
  }
  for (const operation of usable) {
    add(callable(operation));
  }
  for (const skill of enableable) {
    for (const tool of skill.tools) {
      const record = recordsByName.get(String(tool));
      const key = record === undefined ? undefined : Operation.getKey(record);
      if (record !== undefined && key !== undefined) {
        add({
          row: {
            key,
            name: record.name,
            ...(record.description === undefined ? {} : { description: record.description }),
            skill: skillKey(skill),
            callable: false,
          },
          skill: skillKey(skill),
        });
      }
    }
  }
  return [...rows.values()];
};

/** Lower-case words, splitting dotted keys, kebab-case and camelCase; words under three letters say nothing. */
const words = (text: string): string[] =>
  text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3);

/** The items any of the query's words match, most matched first; every item, in order, without a query. */
const ranked = <T>(items: readonly T[], query: string | undefined, text: (item: T) => (string | undefined)[]): T[] => {
  const terms = words(query ?? '');
  if (terms.length === 0) {
    return [...items];
  }
  return items
    .map((item) => {
      const itemWords = words(
        text(item)
          .filter((part) => part !== undefined)
          .join(' '),
      );
      return { item, score: terms.filter((term) => itemWords.some((word) => word.startsWith(term))).length };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .map(({ item }) => item);
};

/** A description's first sentence, which is what a list needs; a lookup by key gives the rest. */
const summary = (text: string): string => (/^.*?[.!?](?=\s|$)/s.exec(text)?.[0] ?? text).slice(0, 200);

/** A row as a list shows it, its description cut to {@link summary}. */
const brief = (row: OperationRow): OperationRow =>
  row.description === undefined ? row : { ...row, description: summary(row.description) };
