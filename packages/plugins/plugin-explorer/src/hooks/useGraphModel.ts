//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/ui';
import { type Filter, type Queue, type Space } from '@dxos/client/echo';
import { SpaceGraphModel, type SpaceGraphModelOptions } from '@dxos/schema';

// TODO(burdon): Factor out.
export const useGraphModel = (
  space: Space | undefined,
  filter?: Filter.Any | undefined,
  options?: SpaceGraphModelOptions,
  queue?: Queue,
): SpaceGraphModel | undefined => {
  const registry = useCapability(Capabilities.AtomRegistry);
  const [model, setModel] = useState<SpaceGraphModel | undefined>(undefined);

  useEffect(() => {
    if (!space) {
      setModel(undefined);
      return;
    }

    const newModel = new SpaceGraphModel(registry);
    void newModel.open(space.db, queue);
    setModel(newModel);

    return () => {
      setModel(undefined);
      void newModel.close();
    };
  }, [space, registry, queue]);

  useEffect(() => {
    model?.setFilter(filter).setOptions(options);
  }, [model, filter, options]);

  return model;
};
