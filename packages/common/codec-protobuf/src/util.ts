//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';

import { type Stream } from './stream';

export const getFirstStreamValue = async <T extends {}>(
  stream: Stream<T>,
  { timeout }: { timeout?: number } = {},
): Promise<T> => {
  try {
    const trigger = new Trigger<T>();
    stream.subscribe((value) => trigger.wake(value));
    return await trigger.wait({ timeout });
  } finally {
    await stream.close();
  }
};
