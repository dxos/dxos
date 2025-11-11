//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ToolId } from '@dxos/ai';
import { Key, Obj, Type } from '@dxos/echo';

// TODO(burdon): Rename (Sequence) and create NS.

export const SequenceStep = Schema.Struct({
  id: Key.ObjectId,
  instructions: Schema.String,
  tools: Schema.optional(Schema.Array(ToolId)),
});

export interface SequenceStep extends Schema.Schema.Type<typeof SequenceStep> {}

export const SequenceDefinition = Schema.Struct({
  steps: Schema.Array(SequenceStep.pipe(Schema.omit('id'))),
});

export interface SequenceDefinition extends Schema.Schema.Type<typeof SequenceDefinition> {}

/**
 * @deprecated
 */
export const Sequence = Schema.Struct({
  name: Schema.optional(Schema.String),
  steps: Schema.Array(SequenceStep),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Sequence',
    version: '0.1.0',
  }),
);
export interface Sequence extends Schema.Schema.Type<typeof Sequence> {}

/**
 * Sequence builder API.
 */
export namespace SequenceBuilder {
  export const create = () => new Builder();

  class Builder {
    private readonly _steps: SequenceStep[] = [];

    step(instructions: string, options?: { tools?: ToolId[] }): Builder {
      this._steps.push({
        id: Key.ObjectId.random(),
        instructions,
        tools: options?.tools ?? [],
      });

      return this;
    }

    build(): Sequence {
      return Obj.make(Sequence, { steps: this._steps });
    }
  }
}

/**
 * Sequence parser API.
 */
export namespace SequenceParser {
  export const create = () => new Parser();

  class Parser {
    parse({ steps }: SequenceDefinition): Sequence {
      const builder = SequenceBuilder.create();
      for (const step of steps) {
        builder.step(step.instructions, {
          tools: [...(step.tools ?? [])],
        });
      }

      return builder.build();
    }
  }
}
