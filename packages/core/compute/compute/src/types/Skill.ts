//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { ToolId } from '@dxos/ai';
import { Annotation, Database, DXN, Filter, Obj, Ref, Registry, Type, URI } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
// Text is referenced in the inferred type of Skill (via Template.Template → Ref.Ref(Text.Text));
// the import lets TypeScript name it in the emitted .d.ts.
// eslint-disable-next-line unused-imports/no-unused-imports
import { type Text } from '@dxos/schema';

import * as McpServer from '../McpServer';
import * as Operation from '../Operation';
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
export class Skill extends Type.makeObject<Skill>(DXN.make('org.dxos.type.skill', '0.2.0'))(
  Schema.Struct({
    /**
     * Human-readable name of the skill.
     */
    name: Schema.String.annotate({
      description: 'Human-readable name of the skill',
    }),

    /**
     * Description of the skill's purpose and functionality.
     */
    description: Schema.optional(Schema.String).annotate({
      description: "Description of the skill's purpose and functionality",
    }),

    /**
     * Instructions that guide the AI assistant's behavior and responses.
     * These are system prompts or guidelines that the AI should follow.
     */
    instructions: Template.Template.annotate({
      description: "Instructions that guide the AI assistant's behavior and responses",
    }),

    /**
     * Array of tools that the AI assistant can use when this skill is active.
     */
    tools: Schema.Array(ToolId).annotate({
      description: 'Array of tools that the AI assistant can use when this skill is active',
    }),

    /**
     * Whether an agent is allowed to auto-enable this skill in a conversation.
     */
    agentCanEnable: Schema.optional(Schema.Boolean).annotate({
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
    Annotation.IconAnnotation.set({ icon: 'ph--blueprint--regular', hue: 'amber' }),
  ),
) {}

/**
 * Controls when the hook is triggered.
 */
export const HookSpec = Schema.Union([
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
]);

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
  function: Schema.optional(Ref.Ref(Obj.Unknown).annotate({ title: 'Function' })),

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
      /** Opt into MCP projection; see {@link McpPromptAnnotation}. Stored in meta, not as a field. */
      mcpPrompt?: boolean;
    } & Partial<Skill>,
  ): Skill;
} = ({ key, version, mcpPrompt, tools = [], instructions = Template.make(), ...props }) => {
  const annotations: Annotation.Dictionary = {};
  if (mcpPrompt !== undefined) {
    Annotation.setDictionary(annotations, McpPromptAnnotation, mcpPrompt);
  }
  return Obj.make(Skill, {
    [Obj.Meta]: { key, version, annotations },
    tools,
    instructions,
    ...props,
  });
};

/**
 * Annotation opting a skill into MCP projection: it becomes a prompt and is loadable by name
 * through the server's `loadSkill` tool.
 *
 * Opt-in: a skill written for an in-app chat runtime may assume tools an MCP client does not have,
 * and only the author can judge whether the workflow still holds on the MCP surface. Absent ⇒ the
 * skill stays internal to hosts that resolve skills directly.
 *
 * Rides in the object's meta rather than on `Definition`, so it survives into a persisted skill —
 * `Definition` is a build-time factory type and cannot describe a skill stored in a space.
 */
/**
 * Skill keys a session scoped to an instance of the annotated type should carry — read by the AI
 * companion, the blank routine template, and project chat creation. Held as plain dotted keys so the
 * annotated type does not depend on the plugin that owns each skill.
 */
export const SkillsAnnotation = Annotation.make<string[]>({
  id: 'org.dxos.annotation.skills',
  schema: Schema.mutable(Schema.Array(Schema.String)),
});

export const McpPromptAnnotation = Annotation.make({
  id: 'org.dxos.skill.mcp-prompt',
  schema: Schema.Boolean,
});

/** Whether the skill opted into MCP projection; see {@link McpPromptAnnotation}. */
export const isMcpPrompt = (skill: Skill): boolean =>
  Annotation.get(skill, McpPromptAnnotation).pipe(Option.getOrElse(() => false));

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
 * Operation tool ids are the model-facing names (see {@link Operation.toolName}), so the skill's
 * `tools` array and the session toolkit speak one identifier space.
 */
export const toolDefinitions = ({
  tools = [],
  operations = [],
}: {
  tools?: readonly string[];
  operations?: readonly Operation.Definition.Any[];
}) => [...operations.map((op) => ToolId.make(Operation.toolName(op))), ...tools.map((tool) => ToolId.make(tool))];

/**
 * Factory for the skills.
 */
export type Definition = {
  key: DXN.Name<string>;
  make: () => Skill;
  /**
   * Operation definitions behind the skill's `tools` list, for hosts that serve the skill without
   * a registry to resolve ToolIds against (see mcp-server `McpServer.fromSkills`). Absent ⇒ the skill is
   * only served through a registry-backed host.
   */
  operations?: readonly Operation.Definition.Any[];
};

/**
 * Returns the canonical URI used to reference this skill in the registry.
 * Use this URI with `Ref.fromURI` to bind a skill without cloning it to the DB.
 *
 * TODO(wittjosiah): Should use Obj.getURI instead once it supports options to prefer meta key over EID.
 */
export const registryURI = (key: DXN.Name<string>): URI.URI => (DXN.tryMake(`dxn:${key}`) ?? URI.make(key)) as URI.URI;

/**
 * Registry skill refs declared by an object's type via {@link SkillsAnnotation}.
 * Bound by URI rather than a DB clone, so the ref resolves through the hypergraph registry.
 */
export const annotatedSkillRefs = (object: Obj.Unknown): Ref.Ref<Skill>[] => {
  const type = Obj.getType(object);
  if (!type) {
    return [];
  }

  return annotatedSkillKeys(type).map((key) => Ref.fromURI(registryURI(key)));
};

/** Skill keys declared by a type via {@link SkillsAnnotation}. */
export const annotatedSkillKeys = (type: Type.AnyEntity): string[] =>
  Option.getOrElse(() => [] as string[])(SkillsAnnotation.get(Type.getSchema(type)));

/**
 * Refs for an object's {@link SkillsAnnotation} keys; a space copy wins, since it is a fork of the
 * registry skill and carries the user's edits.
 *
 * TODO(wittjosiah): Lift this two-source merge into the query layer; it is how forking should work
 *  for any type, not just skills.
 */
export const resolveAnnotatedSkills = Effect.fnUntraced(function* (object: Obj.Unknown) {
  const type = Obj.getType(object);
  const keys = type ? annotatedSkillKeys(type) : [];
  if (keys.length === 0) {
    return [] as Ref.Ref<Skill>[];
  }

  const byKey = new Map<string, Ref.Ref<Skill>>();
  for (const skill of yield* Registry.runQuery(Filter.type(Skill))) {
    const key = Obj.getMeta(skill).key;
    if (key && keys.includes(key)) {
      // By URI rather than a clone: the ECHO ref resolver already spans the registry.
      byKey.set(key, Ref.fromURI(registryURI(key)));
    }
  }
  for (const skill of yield* Database.query(Filter.type(Skill)).run) {
    const key = Obj.getMeta(skill).key;
    if (key && keys.includes(key)) {
      byKey.set(key, Ref.make(skill));
    }
  }

  return [...byKey.values()];
});

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
