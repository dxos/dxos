//
// Copyright 2023 DXOS.org
//
//
// Copyright 2023 DXOS.org
//

import { scheduleMicroTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { getContextFromEntry, log, LogLevel, type LogProcessor } from '@dxos/log';
import { humanize } from '@dxos/util';

import { setTag, setTags } from './node';

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
          setTag('identityKey', context.identityKey.truncate());
          setTag('username', context.displayName ?? humanize(context.identityKey));
        }
        break;
      case 'dxos.halo.device':
        if (context?.deviceKey) {
          setTag('deviceKey', context.deviceKey.truncate());
        }
        if (context?.profile) {
          setTags(context.profile);
        }
        break;
    }
  });
};

log.runtimeConfig.processors.push(USER_PROCESSOR);
