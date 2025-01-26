//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { type DXN } from '@dxos/keys';

import {
  type ComputeGraphModel,
  type ComputeRequirements,
  type Executable,
  type NotExecuted,
  type ValueBag,
} from '../types';

export class Workflow {
  constructor(
    private readonly dxn: DXN,
    private readonly _compiledWorkflow: Executable,
    private readonly _graph: ComputeGraphModel,
    private readonly _stepsByType: Map<string, Executable>,
  ) {}

  run(input: ValueBag<any>): Effect.Effect<ValueBag<any>, Error | NotExecuted, ComputeRequirements> {
    return this._compiledWorkflow.exec!(input).pipe(Effect.withSpan(`workflow(${this.dxn.toString()})`));
  }

  getStep(type: string): Executable | undefined {
    return this._stepsByType.get(type);
  }

  asExecutable() {
    return this._compiledWorkflow;
  }

  asGraph() {
    return this._graph;
  }
}
