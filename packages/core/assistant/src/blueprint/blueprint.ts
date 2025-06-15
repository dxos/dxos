//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Tool } from '@dxos/ai';
import { raise } from '@dxos/debug';
import { ObjectId } from '@dxos/keys';

export const BlueprintStep = Schema.Struct({
  id: Schema.String,
  instructions: Schema.String,
  tools: Schema.Array(Tool).pipe(Schema.mutable),
});
export interface BlueprintStep extends Schema.Schema.Type<typeof BlueprintStep> {}

export const Blueprint = Schema.Struct({
  steps: Schema.Array(BlueprintStep).pipe(Schema.mutable),
});
export interface Blueprint extends Schema.Schema.Type<typeof Blueprint> {}

/**
 * Blueprint builder API.
 */
export namespace BlueprintBuilder {
  export const create = () => new Builder();

  class Builder {
    private readonly _steps: BlueprintStep[] = [];

    step(instructions: string, options?: { tools?: Tool[] }): Builder {
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
  export type Step = {
    instructions: string;
    // TODO(burdon): Tool DXN? Additional metadata?
    tools?: string[];
  };

  export type DSL = {
    steps: Step[];
  };

  export const create = (tools: Tool[] = []) => new Parser(tools);

  class Parser {
    constructor(private readonly _tools: Tool[]) {}

    toJSON() {
      return {
        tools: this._tools.map((tool) => ({
          name: tool.name,
          namespace: tool.namespace,
          type: tool.type,
        })),
      };
    }

    parse({ steps }: DSL): Blueprint {
      const builder = BlueprintBuilder.create();

      for (const step of steps) {
        builder.step(step.instructions, {
          // TODO(burdon): Tool resolution is duplicated in the session and ollama-client.
          tools: step.tools?.map(
            (tool) => this._tools.find(({ id }) => id === tool) ?? raise(new Error(`Tool not found: ${tool}`)),
          ),
        });
      }

      return builder.build();
    }
  }
}
