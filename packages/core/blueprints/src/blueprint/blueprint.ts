//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { ToolId } from '@dxos/ai';
import { Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { DataType } from '@dxos/schema';

import { Template } from '../template';

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
  instructions: Template.annotations({
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

  // TODO(burdon): Move to Type.Obj def?
  LabelAnnotation.set(['name']),
);

/**
 * TypeScript type for Blueprint.
 */
export interface Blueprint extends Schema.Schema.Type<typeof Blueprint> {}

/**
 * Create a new Blueprint.
 */
export const make = ({
  key = `example.com/blueprint/${PublicKey.random().truncate()}`,
  name,
  description,
  instructions = { source: '' },
  tools = [],
}: Pick<Blueprint, 'name'> &
  Omit<Partial<Blueprint>, 'name' | 'instructions'> & {
    instructions?: Omit<Partial<Template>, 'source'> & { source: string };
  }) =>
  Obj.make(Blueprint, {
    key,
    name,
    description,
    instructions: {
      source: Ref.make(Obj.make(DataType.Text, { content: instructions.source })),
      inputs: instructions.inputs,
    },
    tools,
  });
