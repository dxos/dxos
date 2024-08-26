//
// Copyright 2024 DXOS.org
//

import { HyperFormula } from 'hyperformula';
import React, { createContext, type PropsWithChildren, useContext, useEffect } from 'react';

import { Event } from '@dxos/async';
import { raise } from '@dxos/debug';

import { FunctionContext } from '../../model';

export type ComputeGraph = {
  hf: HyperFormula;
  update: Event;
};

export type ComputeGraphContextType = { graph: ComputeGraph };

const ComputeGraphContext = createContext<ComputeGraphContextType | null>(null);

/**
 * Create root graph for space.
 */
// TODO(burdon): Create instance for each space.
export const createComputeGraph = (): ComputeGraph => {
  return {
    hf: HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' }),
    update: new Event(),
  };
};

export const ComputeGraphContextProvider = ({ children, graph }: PropsWithChildren<{ graph: ComputeGraph }>) => {
  useEffect(() => {
    const context = new FunctionContext(graph.hf, () => {
      console.log('??');
      graph.update.emit();
    });

    graph.hf.updateConfig({ context });
  }, [graph]);

  return <ComputeGraphContext.Provider value={{ graph }}>{children}</ComputeGraphContext.Provider>;
};

export const useComputeGraph = (): ComputeGraph => {
  const { graph } = useContext(ComputeGraphContext) ?? raise(new Error('Missing GraphContext'));
  return graph;
};
