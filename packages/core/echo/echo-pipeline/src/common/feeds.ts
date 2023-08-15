//
// Copyright 2022 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { FeedWriter } from '@dxos/feed-store';
import { MaybePromise } from '@dxos/util';

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
