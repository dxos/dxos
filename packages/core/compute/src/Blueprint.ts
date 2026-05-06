//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ToolId } from '@dxos/ai';
import { Annotation, Database, Filter, Obj, Type } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import { log } from '@dxos/log';

import * as Operation from './Operation';
import * as Template from './Template';

/**
 * MCP server definition.
 */
export const McpServer = Schema.Struct({
  /**
   * URL of the MCP server.
   */
  url: Schema.String.annotations({
    description: 'URL of the MCP server',
  }),

  protocol: Schema.Union(Schema.Literal('sse'), Schema.Literal('http')).annotations({
    description: 'Protocol of the MCP server',
  }),
});
export interface McpServer extends Schema.Schema.Type<typeof McpServer> {}

/**
 * Blueprint schema defines the structure for AI assistant blueprints.
 * Blueprints contain instructions, tools, and artifacts that guide the AI's behavior.
 * Blueprints may use tools to create and read artifacts, which are managed by the assistant.
 */
export const Blueprint = Schema.Struct({
  /**
   * Global registry ID.
   * NOTE: The `key` property refers to the original registry entry.
   */
  // TODO(burdon): Create Format type for DXN-like ids, such as this and schema type.
  key: Schema.String.annotations({
    description: 'Unique registration key for the blueprint',
  }),

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
  mcpServers: Schema.optional(Schema.Array(McpServer)),
}).pipe(
  Type.object({
    // TODO(burdon): Is this a DXN? Need to create a Format type for these IDs.
    typename: 'org.dxos.type.blueprint',
    version: '0.1.0',
  }),
  Annotation.LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--blueprint--regular',
    hue: 'sky',
  }),
);

/**
 * TypeScript type for Blueprint.
 */
export interface Blueprint extends Schema.Schema.Type<typeof Blueprint> {}

type MakeProps = Pick<Blueprint, 'key' | 'name'> & Partial<Blueprint>;

/**
 * Create a new Blueprint.
 */
export const make = ({ tools = [], instructions = Template.make(), ...props }: MakeProps) =>
  Obj.make(Blueprint, {
    tools,
    instructions,
    ...props,
  });

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
      if (seen.has(blueprint.key)) {
        log.warn('duplicate blueprint', { key: blueprint.key });
      } else {
        seen.add(blueprint.key);
        this._blueprints.push(blueprint);
      }
    });

    this._blueprints.sort(({ name: a }, { name: b }) => a.localeCompare(b));
  }

  get blueprints(): Blueprint[] {
    return this._blueprints;
  }

  getByKey(key: string): Blueprint | undefined {
    return this._blueprints.find((blueprint) => blueprint.key === key);
  }

  query(): Blueprint[] {
    return this._blueprints;
  }

  updateBlueprints(): Effect.Effect<void, never, Database.Service> {
    return Effect.gen(this, function* () {
      const blueprints = yield* Database.runQuery(Filter.type(Blueprint));
      for (const blueprint of blueprints) {
        const registryBlueprint = this.getByKey(blueprint.key);
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

export class RegistryService extends Context.Tag('@dxos/blueprints/RegistryService')<RegistryService, Registry>() {}

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
    const local = yield* Database.runQuery(Filter.type(Blueprint, { key }));
    if (local.length > 0) {
      return local[0];
    }
    return yield* Database.add(Obj.clone(yield* resolve(key), { deep: true }));
  });

export class NotFoundError extends BaseError.extend('BlueprintNotFound', 'Blueprint not found') {}
