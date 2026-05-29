//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { ToolId } from '@dxos/ai';
import { DXN, Annotation, Database, Filter, Migration, Obj, Type } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import { log } from '@dxos/log';

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
  Annotation.IconAnnotation.set({
    icon: 'ph--blueprint--regular',
    hue: 'sky',
  }),
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
}) => [...operations.map((op) => ToolId.make(op.meta.key)), ...tools.map((tool) => ToolId.make(tool))];

/**
 * Factory for the blueprints.
 */
export type Definition = {
  key: string;
  make: () => Blueprint;
};

//
// Registry
//

/**
 * Blueprint registry.
 */
export class Registry {
  private readonly _blueprints: Blueprint[] = [];

  constructor(blueprints: Blueprint[]) {
    const seen = new Set<string>();
    blueprints.forEach((blueprint) => {
      const key = getKey(blueprint);
      if (seen.has(key)) {
        log.warn('duplicate blueprint', { key });
      } else {
        seen.add(key);
        this._blueprints.push(blueprint);
      }
    });

    this._blueprints.sort(({ name: a }, { name: b }) => a.localeCompare(b));
  }

  get blueprints(): Blueprint[] {
    return this._blueprints;
  }

  getByKey(key: string): Blueprint | undefined {
    return this._blueprints.find((blueprint) => Obj.getMeta(blueprint).key === key);
  }

  query(): Blueprint[] {
    return this._blueprints;
  }

  updateBlueprints(): Effect.Effect<void, never, Database.Service> {
    return Effect.gen(this, function* () {
      const blueprints = yield* Database.runQuery(Filter.type(Blueprint));
      for (const blueprint of blueprints) {
        const blueprintKey = Obj.getMeta(blueprint).key;
        if (!blueprintKey) {
          continue;
        }
        const registryBlueprint = this.getByKey(blueprintKey);
        if (!registryBlueprint) {
          continue;
        }
        const source = Obj.clone(registryBlueprint, { deep: true });
        Obj.update(blueprint, (blueprint) => {
          void Obj.updateFrom(blueprint, source);
        });
      }
    }).pipe(Effect.orDie);
  }
}

export class RegistryService extends Context.Tag('@dxos/blueprints/RegistryService')<RegistryService, Registry>() {
  static notAvailable = Layer.succeed(RegistryService, {
    get blueprints(): Blueprint[] {
      throw new Error('Blueprint registry not available');
    },
    getByKey(_key: string): Blueprint | undefined {
      throw new Error('Blueprint registry not available');
    },
    query(): Blueprint[] {
      throw new Error('Blueprint registry not available');
    },
    updateBlueprints() {
      throw new Error('Blueprint registry not available');
    },
  } as unknown as Registry);
}

/**
 * Resolves a blueprint from the registry.
 * Does not check the local database for the blueprint.
 */
export const resolve = (key: string): Effect.Effect<Blueprint, NotFoundError, RegistryService> =>
  Effect.gen(function* () {
    const registry = yield* RegistryService;
    const blueprint = registry.getByKey(key);
    if (!blueprint) {
      return yield* Effect.fail(new NotFoundError({ context: { key } }));
    }
    return blueprint;
  });

/**
 * Upserts a blueprint into the database.
 * If the blueprint already exists in the database, local blueprint is returned.
 * Otherwise, it will be added.
 */
export const upsert = (key: string): Effect.Effect<Blueprint, NotFoundError, RegistryService | Database.Service> =>
  Effect.gen(function* () {
    const local = yield* Database.runQuery(Filter.and(Filter.type(Blueprint), Filter.key(key)));
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
