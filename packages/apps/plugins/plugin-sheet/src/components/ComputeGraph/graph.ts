//
// Copyright 2024 DXOS.org
//

import { HyperFormula } from 'hyperformula';

import { Event } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { FunctionContext } from './async-function';
import { CustomPlugin, CustomPluginTranslations } from './custom';
import { EdgeFunctionPlugin, EdgeFunctionPluginTranslations } from './edge-function';

/**
 * Create root graph for space.
 */
export const createComputeGraph = (space?: Space): ComputeGraph => {
  // TODO(burdon): Configure.
  HyperFormula.registerFunctionPlugin(CustomPlugin, CustomPluginTranslations);
  HyperFormula.registerFunctionPlugin(EdgeFunctionPlugin, EdgeFunctionPluginTranslations);

  const hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
  return new ComputeGraph(hf, space);
};

/**
 * Per-space compute and dependency graph.
 */
// TODO(burdon): Create instance for each space.
export class ComputeGraph {
  public readonly id = `graph-${PublicKey.random().truncate()}`;
  public readonly update = new Event();

  // The context is passed to all functions.
  public readonly context = new FunctionContext(this.hf, this._space, () => {
    this.refresh();
  });

  constructor(
    public readonly hf: HyperFormula,
    private readonly _space?: Space,
  ) {
    this.hf.updateConfig({ context: this.context });
  }

  refresh() {
    log('refresh', { id: this.id });
    this.update.emit();
  }
}
