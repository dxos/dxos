//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { type Filter, type Queue, type Space } from '@dxos/client/echo';
import { SpaceGraphModel, type SpaceGraphModelOptions } from '@dxos/schema';

// TODO(burdon): Factor out.
export const useGraphModel = (
  space: Space | undefined,
  filter?: Filter.Any | undefined,
  options?: SpaceGraphModelOptions,
  queue?: Queue,
): SpaceGraphModel | undefined => {
  const [model, setModel] = useState<SpaceGraphModel | undefined>(undefined);
  useEffect(() => {
    if (!space) {
      void model?.close();
      setModel(undefined);
      return;
    }

    // TODO(burdon): Does this need to be a dependency?
    if (!model || model.queue !== queue) {
      const model = new SpaceGraphModel().setFilter(filter).setOptions(options);
      void model.open(space.db, queue);
      setModel(model);
    } else {
      model.setFilter(filter).setOptions(options);
    }
  }, [space, filter, options, queue]);

  return model;
};
