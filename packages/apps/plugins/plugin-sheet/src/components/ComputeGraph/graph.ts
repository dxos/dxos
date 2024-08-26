//
// Copyright 2024 DXOS.org
//

import { HyperFormula } from 'hyperformula';

import { Event } from '@dxos/async';

import { FunctionContext } from './async-function';

/**
 * Create root graph for space.
 */
export const createComputeGraph = (): ComputeGraph => {
  const hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
  return new ComputeGraph(hf);
};

/**
 *
 */
// TODO(burdon): Create instance for each space.
export class ComputeGraph {
  public readonly update = new Event();

  public readonly context = new FunctionContext(this.hf, () => {
    this.update.emit();
  });

  constructor(public readonly hf: HyperFormula) {
    this.hf.updateConfig({ context: this.context });
  }
}
