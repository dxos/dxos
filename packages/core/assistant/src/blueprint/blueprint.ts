//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { ToolId } from '@dxos/ai';
import { Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo-schema';

/**
 * Blueprint schema defines the structure for AI assistant blueprints.
 * Blueprints contain instructions, tools, and artifacts that guide the AI's behavior.
 */
export const Blueprint = Schema.Struct({
  /**
   * Global registry ID.
   * NOTE: Once a blueprint has been cloned from the registry, its stored definition may converge,
   * but the `key` property refers to the original registry entry.
   */
  // TODO(burdon): Create Format type.
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
  // TODO(burdon): Change to template.
  instructions: Schema.String.annotations({
    description: "Instructions that guide the AI assistant's behavior and responses",
  }),

  /**
   * Array of tools that the AI assistant can use when this blueprint is active.
   */
  tools: Schema.Array(ToolId).annotations({
    description: 'Array of tools that the AI assistant can use when this blueprint is active',
  }),

  /**
   * Array of artifacts that the AI assistant can create or modify.
   */
  artifacts: Schema.Array(Schema.String).annotations({
    description: 'Ids of artifact definitions that should be pulled into the blueprint',
  }),
}).pipe(
  Type.Obj({
    // TODO(burdon): Is this a DXN? Need to create a Format type for these IDs.
    typename: 'dxos.org/type/Blueprint',
    version: '0.1.0',
  }),

  // TODO(burdon): Move to main API.
  LabelAnnotation.set(['name']),
);

/**
 * TypeScript type for Blueprint.
 */
export interface Blueprint extends Schema.Schema.Type<typeof Blueprint> {}
