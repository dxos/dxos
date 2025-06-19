//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { type ExecutableTool, Tool, type ToolRegistry } from '@dxos/ai';
import { raise } from '@dxos/debug';
import { ObjectId } from '@dxos/keys';

export const BlueprintDefinition = Schema.Struct({
  steps: Schema.Array(
    Schema.Struct({
      instructions: Schema.String,
      // TODO(burdon): Tool DXN? Additional metadata?
      tools: Schema.optional(Schema.Array(Schema.String)),
    }),
  ),
});
export type BlueprintDefinition = Schema.Schema.Type<typeof BlueprintDefinition>;

export const BlueprintStep = Schema.Struct({
  id: Schema.String,
  instructions: Schema.String,
  // TODO(burdon): ExecutableTool can't be serialized.
  tools: Schema.Array(Tool),
});
export interface BlueprintStep extends Schema.Schema.Type<typeof BlueprintStep> {}

export const Blueprint = Schema.Struct({
  steps: Schema.Array(BlueprintStep),
});
export interface Blueprint extends Schema.Schema.Type<typeof Blueprint> {}

/**
 * Blueprint builder API.
 */
export namespace BlueprintBuilder {
  export const create = () => new Builder();

  class Builder {
    private readonly _steps: BlueprintStep[] = [];

    step(instructions: string, options?: { tools?: ExecutableTool[] }): Builder {
      this._steps.push({
        id: ObjectId.random(),
        instructions,
        tools: options?.tools ?? [],
      });

      return this;
    }

    build(): Blueprint {
      return {
        steps: this._steps,
      };
    }
  }
}

/**
 * Blueprint parser API.
 */
export namespace BlueprintParser {
  export const create = (registry: ToolRegistry) => new Parser(registry);

  class Parser {
    constructor(private readonly _registry: ToolRegistry) {}

    parse({ steps }: BlueprintDefinition): Blueprint {
      const builder = BlueprintBuilder.create();
      for (const step of steps) {
        builder.step(step.instructions, {
          tools: step.tools?.map((tool) => this._registry.get(tool) ?? raise(new Error(`Tool not found: ${tool}`))),
        });
      }

      return builder.build();
    }
  }
}
