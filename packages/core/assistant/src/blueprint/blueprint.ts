//
// Copyright 2025 DXOS.org
//

import { Tool } from '@dxos/ai';
import { assertState } from '@dxos/invariant';
import { ObjectId } from '@dxos/keys';
import { Schema } from 'effect';

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

export namespace BlueprintBuilder {
  interface Begin {
    step(instructions: string): Step;
  }
  interface Step {
    step(instructions: string): Step;
    withTool(tool: Tool): Step;
    end(): Blueprint;
  }

  export const begin = (): Begin => new Builder();

  class Builder implements Begin, Step {
    private readonly _steps: BlueprintStep[] = [];

    step(instructions: string): Step {
      this._steps.push({
        id: ObjectId.random(),
        instructions,
        tools: [],
      });
      return this;
    }

    withTool(tool: Tool): Step {
      assertState(this._steps.length > 0, 'Must have at least one step');
      this._steps.at(-1)!.tools.push(tool);
      return this;
    }

    end(): Blueprint {
      return {
        steps: this._steps,
      };
    }
  }
}
