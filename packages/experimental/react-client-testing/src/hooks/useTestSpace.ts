//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import { useEffect, useMemo, useState } from 'react';

import { Space } from '@dxos/client';
import { SpaceBuilder, buildTestSpace } from '@dxos/client-testing';
import { useClient } from '@dxos/react-client';

type TestSpaceCallback = (builder: SpaceBuilder) => Promise<void>;

/**
 * Generate test space.
 */
export const useTestSpace = (callback: TestSpaceCallback = buildTestSpace): Space | undefined => {
  const client = useClient();
  const [space, setSpace] = useState<Space>();
  const builder = useSpaceBuilder(space);

  useEffect(() => {
    setTimeout(async () => {
      // TODO(burdon): Use SpaceBuidler.
      const space = await client.echo.createSpace();
      await space.setTitle(faker.lorem.word());
      setSpace(space);
    });
  }, []);

  useEffect(() => {
    if (builder) {
      setTimeout(async () => {
        await callback(builder);
      });
    }
  }, [builder, space]);

  return space;
};

/**
 * @param space
 */
export const useSpaceBuilder = (space?: Space) =>
  useMemo(() => (space ? new SpaceBuilder(space) : undefined), [space?.key.toHex()]);
