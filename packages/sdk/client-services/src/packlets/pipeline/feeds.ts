//
// Copyright 2022 DXOS.org
//

import { type FeedWriter } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { type MaybePromise } from '@dxos/util';

/**
 * Maps the written arguments onto a different message type.
 */
export const createMappedFeedWriter = <Source extends {}, Target extends {}>(
  mapper: (arg: Source) => MaybePromise<Target>,
  writer: FeedWriter<Target>,
): FeedWriter<Source> => {
  invariant(mapper);
  invariant(writer);

  return {
    write: async (data: Source, options) => await writer.write(await mapper(data), options),
  };
};
