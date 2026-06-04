//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { ToolId } from '@dxos/ai';
import { DXN, Annotation, Key, Obj, Type } from '@dxos/echo';

export const Step = Schema.Struct({
  id: Key.EntityId,
  instructions: Schema.String,
  tools: Schema.optional(Schema.Array(ToolId)),
});

export type Step = Schema.Schema.Type<typeof Step>;
export const Definition = Schema.Struct({
  steps: Schema.Array(Step.pipe(Schema.omit('id'))),
});

export type Definition = Schema.Schema.Type<typeof Definition>;
/**
 * @deprecated
 */
export const Sequence = Schema.Struct({
  name: Schema.optional(Schema.String),
  steps: Schema.Array(Step),
}).pipe(
  Annotation.IconAnnotation.set({ icon: 'ph--circuitry--regular', hue: 'sky' }),
  Type.makeObject(DXN.make('org.dxos.type.sequence', '0.1.0')),
);

export type Sequence = Type.InstanceType<typeof Sequence>;
/**
 * Sequence builder API.
 */
export namespace Builder {
  export const create = () => new Impl();

  class Impl {
    private readonly _steps: Step[] = [];

    step(instructions: string, options?: { tools?: ToolId[] }): Impl {
      this._steps.push({
        id: Key.EntityId.random(),
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
export namespace Parser {
  export const create = () => new Impl();

  class Impl {
    parse({ steps }: Definition): Sequence {
      const builder = Builder.create();
      for (const step of steps) {
        builder.step(step.instructions, {
          tools: [...(step.tools ?? [])],
        });
      }

      return builder.build();
    }
  }
}
