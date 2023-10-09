//
// Copyright 2023 DXOS.org
//
//
// Copyright 2023 DXOS.org
//

import { scheduleMicroTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { getContextFromEntry, log, LogLevel, LogProcessor } from '@dxos/log';
import { humanize } from '@dxos/util';

import { setTag, setUser } from './node-util';

const ctx = new Context({ onError: (err) => log.warn('Unhandled error in Sentry context', err) });

export const USER_PROCESSOR: LogProcessor = (config, entry) => {
  const { message, level } = entry;
  const context = getContextFromEntry(entry);

  if (level !== LogLevel.TRACE) {
    return;
  }

  scheduleMicroTask(ctx, async () => {
    switch (message) {
      case 'dxos.halo.identity':
        if (context?.identityKey) {
          setUser({
            id: context.identityKey.truncate(),
            username: context.displayName ?? humanize(context.identityKey),
          });
        }
        break;
      case 'dxos.halo.device':
        setTag('device', context?.deviceKey?.truncate());
        break;
    }
  });
};

log.runtimeConfig.processors.push(USER_PROCESSOR);
