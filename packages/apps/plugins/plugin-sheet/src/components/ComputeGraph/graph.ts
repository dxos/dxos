//
// Copyright 2024 DXOS.org
//

import { HyperFormula } from 'hyperformula';

import { Event } from '@dxos/async';

import { FunctionContext } from './async-function';
import { CustomPlugin, CustomPluginTranslations } from './custom';

/**
 * Create root graph for space.
 */
export const createComputeGraph = (): ComputeGraph => {
  HyperFormula.registerFunctionPlugin(CustomPlugin, CustomPluginTranslations);
  const hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
  return new ComputeGraph(hf);
};

/**
 * Per-space compute and dependency graph.
 */
// TODO(burdon): Create instance for each space.
export class ComputeGraph {
  public readonly update = new Event();

  // The context is passed to all functions.
  public readonly context = new FunctionContext(this.hf, () => {
    this.update.emit();
  });

  constructor(public readonly hf: HyperFormula) {
    this.hf.updateConfig({ context: this.context });
  }
}
