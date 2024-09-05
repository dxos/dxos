//
// Copyright 2024 DXOS.org
//

import { type FunctionPluginDefinition, HyperFormula } from 'hyperformula';
import { type FunctionTranslationsPackage } from 'hyperformula/typings/interpreter';

import { Event } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { FunctionContext, type FunctionContextOptions } from './async-function';

/**
 * Create root graph for space.
 */
export const createComputeGraph = (
  // TODO(wittjosiah): Factor out this type to make these easier to define.
  functionPlugins: { plugin: FunctionPluginDefinition; translations: FunctionTranslationsPackage }[] = [],
  space?: Space,
  options?: Partial<FunctionContextOptions>,
): ComputeGraph => {
  functionPlugins.forEach(({ plugin, translations }) => {
    HyperFormula.registerFunctionPlugin(plugin, translations);
  });

  const hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
  return new ComputeGraph(hf, space, options);
};

/**
 * Per-space compute and dependency graph.
 */
// TODO(burdon): Create instance for each space.
export class ComputeGraph {
  public readonly id = `graph-${PublicKey.random().truncate()}`;
  public readonly update = new Event();

  // The context is passed to all functions.
  public readonly context = new FunctionContext(
    this.hf,
    this._space,
    () => {
      this.refresh();
    },
    this._options,
  );

  constructor(
    public readonly hf: HyperFormula,
    private readonly _space?: Space,
    private readonly _options?: Partial<FunctionContextOptions>,
  ) {
    this.hf.updateConfig({ context: this.context });
  }

  refresh() {
    log('refresh', { id: this.id });
    this.update.emit();
  }
}
