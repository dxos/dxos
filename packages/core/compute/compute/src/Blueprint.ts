//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ToolId } from '@dxos/ai';
import { DXN, Annotation, Database, Filter, Migration, Obj, Registry, Type, URI } from '@dxos/echo';
import { BaseError } from '@dxos/errors';

import * as McpServer from './McpServer';
import * as Operation from './Operation';
import * as Template from './Template';

/**
 * Blueprint schema defines the structure for AI assistant blueprints.
 * Blueprints contain instructions, tools, and artifacts that guide the AI's behavior.
 * Blueprints may use tools to create and read artifacts, which are managed by the assistant.
 *
 * The registry `key` and `version` are stored in the object meta — access them via
 * `Obj.getMeta(blueprint).key` and `Obj.getMeta(blueprint).version`.
 */
// TODO(burdon): Rename Skill?
export const Blueprint = Schema.Struct({
  /**
   * Human-readable name of the blueprint.
   */
  name: Schema.String.annotations({
    description: 'Human-readable name of the blueprint',
  }),

  /**
   * Description of the blueprint's purpose and functionality.
   */
  description: Schema.optional(Schema.String).annotations({
    description: "Description of the blueprint's purpose and functionality",
  }),

  /**
   * Instructions that guide the AI assistant's behavior and responses.
   * These are system prompts or guidelines that the AI should follow.
   */
  instructions: Template.Template.annotations({
    description: "Instructions that guide the AI assistant's behavior and responses",
  }),

  /**
   * Array of tools that the AI assistant can use when this blueprint is active.
   */
  tools: Schema.Array(ToolId).annotations({
    description: 'Array of tools that the AI assistant can use when this blueprint is active',
  }),

  /**
   * Whether an agent is allowed to auto-enable this blueprint in a conversation.
   */
  agentCanEnable: Schema.optional(Schema.Boolean).annotations({
    description: 'Whether an agent is allowed to auto-enable this blueprint in a conversation.',
  }),

  /**
   * Array of MCP servers that the AI assistant can use when this blueprint is active.
   */
  mcpServers: Schema.optional(Schema.Array(McpServer.McpServer)),
}).pipe(
  Annotation.LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--blueprint--regular', hue: 'sky' }),
  Type.makeObject(DXN.make('org.dxos.type.blueprint', '0.2.0')),
);

/**
 * TypeScript type for Blueprint.
 */
export type Blueprint = Type.InstanceType<typeof Blueprint>;

type MakeProps = { key: string; version?: string; name: string } & Partial<Blueprint>;

/**
 * Create a new Blueprint.
 * The `key` (and optional `version`) are stored in the object meta.
 */
export const make = ({ key, version, tools = [], instructions = Template.make(), ...props }: MakeProps) =>
  Obj.make(Blueprint, {
    [Obj.Meta]: { key, version },
    tools,
    instructions,
    ...props,
  });

/**
 * Get the registry key for a blueprint.
 */
export const getKey = (blueprint: Blueprint): string => {
  const key = Obj.getMeta(blueprint).key;
  if (key === undefined) {
    throw new Error('Blueprint is missing the meta key.');
  }
  return key;
};

/**
 * Get the registry version for a blueprint, if any.
 */
export const getVersion = (blueprint: Blueprint): string | undefined => Obj.getMeta(blueprint).version;

/**
 * Util to create tool definitions for a blueprint.
 */
export const toolDefinitions = ({
  tools = [],
  operations = [],
}: {
  tools?: string[];
  operations?: Operation.Definition.Any[];
}) => [...operations.map((op) => ToolId.make(DXN.getName(op.meta.key))), ...tools.map((tool) => ToolId.make(tool))];

/**
 * Factory for the blueprints.
 */
export type Definition = {
  key: string;
  make: () => Blueprint;
};

/**
 * Returns the canonical URI used to reference this blueprint in the registry.
 * Valid DXN keys produce `dxn:<key>`; other keys use the raw key as a URI.
 * Use this URI with `Ref.fromURI` to bind a blueprint without cloning it to the DB.
 *
 * TODO(wittjosiah): Should use Obj.getURI instead once it supports options to prefer meta key over EID.
 */
export const registryURI = (key: string): URI.URI => (DXN.tryMake(`dxn:${key}`) ?? URI.make(key)) as URI.URI;

/**
 * Resolves a blueprint from the registry by its meta key.
 * Does not check the local database for the blueprint.
 */
export const resolve = (key: string): Effect.Effect<Blueprint, NotFoundError, Registry.Service> =>
  Effect.gen(function* () {
    const results = yield* Registry.runQuery(Filter.and(Filter.type(Blueprint), Filter.key(key)));
    const blueprint = results[0];
    if (!blueprint) {
      return yield* Effect.fail(new NotFoundError({ context: { key } }));
    }
    return blueprint;
  });

/**
 * Upserts a blueprint into the database.
 * If the blueprint already exists in the database, the local (possibly forked) copy is returned as-is.
 * Otherwise, a fresh copy is cloned from the registry and added.
 * @deprecated Since we're using a registry we no longer need to store blueprints in the database.
 */
// TODO(dmaretskyi): Remove.
export const upsert = (key: string): Effect.Effect<Blueprint, NotFoundError, Registry.Service | Database.Service> =>
  Effect.gen(function* () {
    const local = yield* Database.query(Filter.and(Filter.type(Blueprint), Filter.key(key))).run;
    if (local.length > 0) {
      return local[0];
    }
    return yield* Database.add(Obj.clone(yield* resolve(key), { deep: true }));
  });

export class NotFoundError extends BaseError.extend('BlueprintNotFound', 'Blueprint not found') {}

//
// Legacy schemas and migrations.
//

/**
 * Blueprint schema v0.1.0 — `key` is stored as a data property.
 * @deprecated Use {@link Blueprint} (v0.2.0) instead; the `key` and `version` now live in the object meta.
 */
export const Blueprint_v0_1_0 = Schema.Struct({
  /**
   * Global registry ID.
   * NOTE: The `key` property refers to the original registry entry.
   */
  key: Schema.String.annotations({
    description: 'Unique registration key for the blueprint',
  }),

  name: Schema.String.annotations({
    description: 'Human-readable name of the blueprint',
  }),

  description: Schema.optional(Schema.String),

  instructions: Template.Template,

  tools: Schema.Array(ToolId),

  agentCanEnable: Schema.optional(Schema.Boolean),

  mcpServers: Schema.optional(Schema.Array(McpServer.McpServer)),
}).pipe(Type.makeObject(DXN.make('org.dxos.type.blueprint', '0.1.0')));

export type Blueprint_v0_1_0 = Type.InstanceType<typeof Blueprint_v0_1_0>;
/**
 * Migration from {@link Blueprint_v0_1_0} (v0.1.0) to {@link Blueprint} (v0.2.0).
 * Moves `key` from the data section into the object meta.
 */
const _migration = Migration.define({
  from: Blueprint_v0_1_0,
  to: Blueprint,
  transform: async (from) => ({
    [Obj.Meta]: { key: from.key, version: '0.1.0' },
    name: from.name,
    description: from.description,
    instructions: from.instructions,
    tools: from.tools,
    agentCanEnable: from.agentCanEnable,
    mcpServers: from.mcpServers,
  }),
});

/**
 * Schema migrations exported by this module.
 * Exported as an array for extensibility — append future versions here.
 */
export const migrations = [_migration];
