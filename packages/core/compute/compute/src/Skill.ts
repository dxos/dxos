//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ToolId } from '@dxos/ai';
import { DXN, Annotation, Database, Filter, Obj, Ref, Registry, Type, URI } from '@dxos/echo';
import { BaseError } from '@dxos/errors';

import * as McpServer from './McpServer';
import * as Operation from './Operation';
import * as Template from './Template';
import * as Trigger from './Trigger';

/**
 * Skill schema defines the structure for AI assistant skills.
 * Skills contain instructions, tools, and artifacts that guide the AI's behavior.
 * Skills may use tools to create and read artifacts, which are managed by the assistant.
 *
 * The registry `key` and `version` are stored in the object meta — access them via
 * `Obj.getMeta(skill).key` and `Obj.getMeta(skill).version`.
 */
export const Skill = Schema.Struct({
  /**
   * Human-readable name of the skill.
   */
  name: Schema.String.annotations({
    description: 'Human-readable name of the skill',
  }),

  /**
   * Description of the skill's purpose and functionality.
   */
  description: Schema.optional(Schema.String).annotations({
    description: "Description of the skill's purpose and functionality",
  }),

  /**
   * Instructions that guide the AI assistant's behavior and responses.
   * These are system prompts or guidelines that the AI should follow.
   */
  instructions: Template.Template.annotations({
    description: "Instructions that guide the AI assistant's behavior and responses",
  }),

  /**
   * Array of tools that the AI assistant can use when this skill is active.
   */
  tools: Schema.Array(ToolId).annotations({
    description: 'Array of tools that the AI assistant can use when this skill is active',
  }),

  /**
   * Whether an agent is allowed to auto-enable this skill in a conversation.
   */
  agentCanEnable: Schema.optional(Schema.Boolean).annotations({
    description: 'Whether an agent is allowed to auto-enable this skill in a conversation.',
  }),

  /**
   * Array of MCP servers that the AI assistant can use when this skill is active.
   */
  mcpServers: Schema.optional(Schema.Array(McpServer.McpServer)),

  /**
   * Hooks triggered automatically at certain points in the agent's lifecycle.
   */
  hooks: Schema.optional(Schema.Array(Schema.suspend(() => Hook))),
}).pipe(
  Annotation.LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--blueprint--regular', hue: 'sky' }),
  Type.makeObject(DXN.make('org.dxos.type.skill', '0.2.0')),
);

/**
 * Controls when the hook is triggered.
 */
export const HookSpec = Schema.Union(
  /**
   * Triggered when the agent is about to start a request.
   * A request is a series of agent/tool turns that the model drives.
   */
  Schema.TaggedStruct('begin-request', {}),
  /**
   * Triggered when the agent has completed a request.
   * A request is a series of agent/tool turns that the model drives.
   */
  Schema.TaggedStruct('end-request', {}),
);

/**
 * Allows hooking into the agent's lifecycle.
 * NOTE: Intentionally similar to Trigger, perhaps we should merge them.
 */
export const Hook = Schema.Struct({
  /**
   * What to do when the hook is triggered.
   *
   * Can be a Ref to a PersistentOperation.
   */
  function: Schema.optional(Ref.Ref(Obj.Unknown).annotations({ title: 'Function' })),

  /**
   * Controls when the hook is triggered.
   */
  spec: HookSpec,

  /**
   * Passed as the input data to the function.
   * Must match the function's input schema.
   */
  input: Trigger.InputTemplate.pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
});

/**
 * TypeScript type for Skill.
 */
export type Skill = Type.InstanceType<typeof Skill>;

/**
 * Create a new Skill.
 * The `key` (and optional `version`) are stored in the object meta.
 * `key` must be a valid DXN name (e.g. `org.dxos.skill.mySkill`).
 */
export const make: {
  <T extends string>(
    props: {
      key: [DXN.Name<T>] extends [never] ? `Invalid DXN name "${T}": final segment must be camelCase (no hyphens)` : T;
      version?: string;
      name: string;
    } & Partial<Skill>,
  ): Skill;
} = ({ key, version, tools = [], instructions = Template.make(), ...props }) =>
  Obj.make(Skill, {
    [Obj.Meta]: { key, version },
    tools,
    instructions,
    ...props,
  });

/**
 * Get the registry key for a skill.
 */
export const getKey = (skill: Skill): string => {
  const key = Obj.getMeta(skill).key;
  if (key === undefined) {
    throw new Error('Skill is missing the meta key.');
  }
  return key;
};

/**
 * Get the registry version for a skill, if any.
 */
export const getVersion = (skill: Skill): string | undefined => Obj.getMeta(skill).version;

/**
 * Util to create tool definitions for a skill.
 */
export const toolDefinitions = ({
  tools = [],
  operations = [],
}: {
  tools?: string[];
  operations?: Operation.Definition.Any[];
}) => [...operations.map((op) => ToolId.make(DXN.getName(op.meta.key))), ...tools.map((tool) => ToolId.make(tool))];

/**
 * Factory for the skills.
 */
export type Definition = {
  key: DXN.Name<string>;
  make: () => Skill;
};

/**
 * Returns the canonical URI used to reference this skill in the registry.
 * Use this URI with `Ref.fromURI` to bind a skill without cloning it to the DB.
 *
 * TODO(wittjosiah): Should use Obj.getURI instead once it supports options to prefer meta key over EID.
 */
export const registryURI = (key: DXN.Name<string>): URI.URI => (DXN.tryMake(`dxn:${key}`) ?? URI.make(key)) as URI.URI;

/**
 * Resolves a skill from the registry by its meta key.
 * Does not check the local database for the skill.
 */
export const resolve = (key: string): Effect.Effect<Skill, NotFoundError, Registry.Service> =>
  Effect.gen(function* () {
    const results = yield* Registry.runQuery(Filter.and(Filter.type(Skill), Filter.key(key)));
    const skill = results[0];
    if (!skill) {
      return yield* Effect.fail(new NotFoundError({ context: { key } }));
    }
    return skill;
  });

/**
 * Upserts a skill into the database.
 * If the skill already exists in the database, the local (possibly forked) copy is returned as-is.
 * Otherwise, a fresh copy is cloned from the registry and added.
 * @deprecated Since we're using a registry we no longer need to store skills in the database.
 */
// TODO(dmaretskyi): Remove.
export const upsert = (key: string): Effect.Effect<Skill, NotFoundError, Registry.Service | Database.Service> =>
  Effect.gen(function* () {
    const local = yield* Database.query(Filter.and(Filter.type(Skill), Filter.key(key))).run;
    if (local.length > 0) {
      return local[0];
    }
    return yield* Database.add(Obj.clone(yield* resolve(key), { deep: 'all' }));
  });

export class NotFoundError extends BaseError.extend('SkillNotFound', 'Skill not found') {}
