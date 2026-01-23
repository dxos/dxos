//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ToolId } from '@dxos/ai';
import { Annotation, Obj, Type } from '@dxos/echo';
import { type FunctionDefinition } from '@dxos/functions';

import * as Template from '../template';

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
}).pipe(
  Type.Obj({
    // TODO(burdon): Is this a DXN? Need to create a Format type for these IDs.
    typename: 'dxos.org/type/Blueprint',
    version: '0.1.0',
  }),
  Annotation.LabelAnnotation.set(['name']),
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
  functions = [],
}: {
  tools?: string[];
  functions?: FunctionDefinition[];
}) => [...functions.map((fn) => ToolId.make(fn.key)), ...tools.map((tool) => ToolId.make(tool))];
