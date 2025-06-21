//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Obj, Type } from '@dxos/echo';
import { ObjectId } from '@dxos/keys';

export const BlueprintStep = Schema.Struct({
  id: ObjectId,
  instructions: Schema.String,
  tools: Schema.Array(Schema.String),
});
export interface BlueprintStep extends Schema.Schema.Type<typeof BlueprintStep> {}

export const BlueprintDefinition = Schema.Struct({
  steps: Schema.Array(BlueprintStep.pipe(Schema.omit('id'))),
});
export interface BlueprintDefinition extends Schema.Schema.Type<typeof BlueprintDefinition> {}

export const Blueprint = Schema.Struct({
  name: Schema.optional(Schema.String),
  steps: Schema.Array(BlueprintStep),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Blueprint',
    version: '0.1.0',
  }),
);
export interface Blueprint extends Schema.Schema.Type<typeof Blueprint> {}

/**
 * Blueprint builder API.
 */
export namespace BlueprintBuilder {
  export const create = () => new Builder();

  class Builder {
    private readonly _steps: BlueprintStep[] = [];

    step(instructions: string, options?: { tools?: string[] }): Builder {
      this._steps.push({
        id: ObjectId.random(),
        instructions,
        tools: options?.tools ?? [],
      });

      return this;
    }

    build(): Blueprint {
      return Obj.make(Blueprint, { steps: this._steps });
    }
  }
}

/**
 * Blueprint parser API.
 */
export namespace BlueprintParser {
  export const create = () => new Parser();

  class Parser {
    parse({ steps }: BlueprintDefinition): Blueprint {
      const builder = BlueprintBuilder.create();
      for (const step of steps) {
        builder.step(step.instructions, {
          tools: (step.tools ?? []) as string[],
        });
      }

      return builder.build();
    }
  }
}
