//
// Copyright 2025 DXOS.org
//

import type { Tool } from '@dxos/ai';
import { assertState } from '@dxos/invariant';
import { ObjectId } from '@dxos/keys';

export type Blueprint = {
  steps: BlueprintStep[];
};

export const Blueprint = Object.freeze({
  make: (steps: string[]): Blueprint => {
    return {
      steps: steps.map(
        (step, index): BlueprintStep => ({
          id: ObjectId.random(),
          instructions: step,
          tools: [],
        }),
      ),
    };
  },
});

export type BlueprintStep = {
  id: ObjectId;
  instructions: string;
  tools: Tool[];
};

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
