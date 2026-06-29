//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/ui';
import { type Database, type Entity, type Filter } from '@dxos/echo';
import { SpaceGraphModel, type SpaceGraphModelOptions } from '@dxos/schema';

// TODO(burdon): Factor out.
export const useGraphModel = (
  db: Database.Database | undefined,
  filter?: Filter.Any | undefined,
  options?: SpaceGraphModelOptions,
  items?: readonly Entity.Unknown[],
): SpaceGraphModel | undefined => {
  const registry = useCapability(Capabilities.AtomRegistry);
  const [model, setModel] = useState<SpaceGraphModel | undefined>(undefined);

  useEffect(() => {
    if (!db) {
      setModel(undefined);
      return;
    }

    const newModel = new SpaceGraphModel(registry);
    void newModel.open(db);
    setModel(newModel);

    return () => {
      setModel(undefined);
      void newModel.close();
    };
  }, [db, registry]);

  useEffect(() => {
    model?.setFilter(filter).setOptions(options);
  }, [model, filter, options]);

  useEffect(() => {
    model?.setItems(items);
  }, [model, items]);

  return model;
};
