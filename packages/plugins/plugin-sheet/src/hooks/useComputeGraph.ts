//
// Copyright 2024 DXOS.org
//

import { useContext, useEffect } from 'react';

import { type Space } from '@dxos/react-client/echo';

import { ComputeGraphContext } from '../components';
import {
  type ComputeGraph,
  CustomPlugin,
  CustomPluginTranslations,
  EdgeFunctionPlugin,
  EdgeFunctionPluginTranslations,
  type FunctionContextOptions,
  createComputeGraph,
} from '../graph';

//
// NOTE: Separate file so that using `ComputeGraphContextProvider` does not require loading hyperformula.
//

export const useComputeGraph = (space: Space, options?: Partial<FunctionContextOptions>): ComputeGraph => {
  const { graphs, setGraph } = useContext(ComputeGraphContext);
  const graph =
    graphs[space.id] ??
    createComputeGraph(
      [
        { plugin: EdgeFunctionPlugin, translations: EdgeFunctionPluginTranslations },
        // TODO(wittjosiah): Remove. Needed for current test sheet generated data.
        { plugin: CustomPlugin, translations: CustomPluginTranslations },
      ],
      space,
      options,
    );

  useEffect(() => {
    if (!graphs[space.id]) {
      setGraph(space.id, graph);
    }
  }, [space]);

  return graph;
};
