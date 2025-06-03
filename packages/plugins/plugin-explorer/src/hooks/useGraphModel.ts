//
// Copyright 2023 DXOS.org
//

import { type Space } from '@dxos/client/echo';
import { useAsyncState } from '@dxos/react-ui';
import { SpaceGraphModel } from '@dxos/schema';

// TODO(burdon): Factor out.
export const useGraphModel = (space: Space | undefined): SpaceGraphModel | undefined => {
  const [model] = useAsyncState<SpaceGraphModel>(
    async () => (space ? new SpaceGraphModel({}, { schema: true }).open(space) : undefined),
    [space],
  );

  return model;
};
