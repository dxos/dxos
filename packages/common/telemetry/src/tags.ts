//
// Copyright 2023 DXOS.org
//

import { scheduleMicroTask } from '@dxos/async';
import { ConfigProto } from '@dxos/config';
import { Context } from '@dxos/context';
import { log, LogLevel, LogProcessor, getContextFromEntry } from '@dxos/log';
import { humanize } from '@dxos/util';

/**
 * Fetches the local kube config and returns the telemetry tags.
 * Intention is to use this to tag telemetry events as `internal`.
 */
export const getLocalTelemetryTags = async (): Promise<string[]> => {
  // NOTE: We use the local kube config to get the telemetry tags.
  // We use localhost and not `kube.local` here because it is allowed to make requests to localhost without CORS.
  const localKubeConfigUrl = 'http://localhost:80/.well-known/dx/config';

  log('fetching config...', { localKubeConfigUrl });
  try {
    return await fetch(localKubeConfigUrl).then((res) =>
      (res.json() as Promise<ConfigProto>).then((config) => config?.runtime?.kube?.telemetry?.tags ?? []),
    );
  } catch (error) {
    log('Failed to fetch telemetry tags', error);
    return [];
  }
};

export const tags: any = {};

const ctx = new Context();

const TAGS_PROCESSOR: LogProcessor = (config, entry) => {
  const { message, level } = entry;
  const context = getContextFromEntry(entry);

  if (level !== LogLevel.TRACE) {
    return;
  }

  scheduleMicroTask(ctx, async () => {
    switch (message) {
      case 'dxos.halo.identity':
        if (context?.identityKey) {
          tags.identityKey = context.identityKey.truncate();
          tags.username = context.displayName ?? humanize(context.identityKey);
        }
        break;
      case 'dxos.halo.device':
        if (context?.deviceKey) {
          tags.deviceKey = context.deviceKey.truncate();
        }
        if (context?.profile) {
          tags.deviceProfile = context.profile;
        }
        break;
    }
  });
};

log.runtimeConfig.processors.push(TAGS_PROCESSOR);
