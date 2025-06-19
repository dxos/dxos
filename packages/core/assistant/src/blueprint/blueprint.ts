//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { type ExecutableTool, Tool, type ToolRegistry } from '@dxos/ai';
import { raise } from '@dxos/debug';
import { Type } from '@dxos/echo';
import { ObjectId } from '@dxos/keys';

export const BlueprintType = Schema.Struct({
  name: Schema.optional(Schema.String),
  steps: Schema.Array(
    Schema.Struct({
      instructions: Schema.String,
      // TODO(burdon): Tool DXN? Additional metadata?
      tools: Schema.optional(Schema.Array(Schema.String)),
    }),
  ),
}).pipe(Type.Obj({ typename: 'dxos.org/type/Blueprint', version: '0.1.0' }));
export type BlueprintType = Schema.Schema.Type<typeof BlueprintType>;

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

    parse({ steps }: BlueprintType): Blueprint {
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
