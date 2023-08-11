//
// Copyright 2022 DXOS.org
//

import invariant from 'tiny-invariant';

import { asyncTimeout, Trigger } from '@dxos/async';
import { Space } from '@dxos/client-protocol';
import { ConfigProto } from '@dxos/config';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { STORAGE_VERSION } from '@dxos/protocols';
import {
  Device,
  Identity,
  Metrics,
  Space as SpaceProto,
  SpaceMember,
  SpacesService,
} from '@dxos/protocols/proto/dxos/client/services';
import { SubscribeToFeedsResponse, SubscribeToSpacesResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { Timeframe } from '@dxos/timeframe';

import { getPlatform, Platform } from './platform';
import { jsonStringify, JsonStringifyOptions } from './util';
import { ServiceContext } from './service-context';
import { ClientServicesHost } from './service-host';
import { Stream } from '@dxos/codec-protobuf';
import { DataSpace } from '../spaces';
import { DocumentModel, DocumentModelState } from '@dxos/document-model';
import { credentialTypeFilter, getCredentialAssertion } from '@dxos/credentials';
import { Epoch } from '@dxos/protocols/src/proto/gen/dxos/halo/credentials';

const DEFAULT_DIAGNOSTICS_TIMEOUT = 1000;

export type Diagnostics = {
  created: string;
  platform: Platform;
  config?: ConfigProto;
  client: {
    version: string;
    storage: {
      version: number;
    };
  };
  identity?: Identity;
  devices?: Device[];
  spaces?: SpaceStats[];
  feeds?: Partial<SubscribeToFeedsResponse.Feed>[];
  metrics?: Metrics;
};

// TODO(burdon): Normalize for ECHO/HALO.
export type SpaceStats = {
  properties?: {
    name: string;
  };
  metrics?: SpaceProto.Metrics & {
    startupTime?: number;
  };
  db?: {
    objects: number;
  };
  epochs?: (Epoch & { id?: PublicKey })[];
  members?: SpaceMember[];
  pipeline?: SpaceProto.PipelineState;
};

export type DiagnosticOptions = JsonStringifyOptions;

// TODO(burdon): Move to Client/Services.
export const createDiagnostics = async (clientServiceHost: ClientServicesHost, options: DiagnosticOptions): Promise<Diagnostics> => {
  const identity = clientServiceHost._serviceContext.identityManager.identity;
  log('diagnostics...', { identity });

  const data: Diagnostics = {
    created: new Date().toISOString(),
    platform: getPlatform(),
    client: {
      version: 'TODO',
      storage: {
        version: STORAGE_VERSION,
      },
    },

    // TODO(burdon): Are these the same?
    // config: await clientServiceHost.services.SystemService?.getConfig(),
    config: clientServiceHost.config?.values,
  };

  // Trace metrics.
  {
    invariant(clientServiceHost.services.LoggingService, 'SystemService is not available.');
    data.metrics = await getFirstStreamValue(clientServiceHost.services.LoggingService.queryMetrics({}), { timeout: DEFAULT_DIAGNOSTICS_TIMEOUT }).catch(() => undefined);
  }

  if (identity) {
    const devices = await getFirstStreamValue(clientServiceHost.services.DevicesService!.queryDevices(), { timeout: DEFAULT_DIAGNOSTICS_TIMEOUT }).catch(() => undefined);
    Object.assign(data, {
      identity,
      devices,
    });

    // Spaces.
    if (clientServiceHost._serviceContext.dataSpaceManager) {

      data.spaces = await Promise.all(Array.from(clientServiceHost._serviceContext.dataSpaceManager.spaces.values()).map(async (space) => await getSpaceStats(space)) ?? []);
    }

    // Feeds.
    {
      const { feeds = [] } = await getFirstStreamValue(clientServiceHost.services.DevtoolsHost!.subscribeToFeeds({}), { timeout: DEFAULT_DIAGNOSTICS_TIMEOUT }).catch(() => undefined) ?? {};
      data.feeds = feeds.map(({ feedKey, bytes, length }) => ({ feedKey, bytes, length }));
    }
  }

  return jsonStringify(data, options) as Diagnostics;
};

// TODO(burdon): Normalize for ECHO/HALO.
const getSpaceStats = async (space: DataSpace): Promise<SpaceStats> => {
  // TODO(dmaretskyi): Metrics for halo space.
  const stats: SpaceStats = {};

  let properties: any = undefined;

  try {
    // Add properties to cache.
    const propertiesItem = space.dataPipeline.itemManager.items.find(
      (item) =>
        item.modelMeta?.type === DocumentModel.meta.type &&
        (item.state as DocumentModelState)?.type === 'dxos.sdk.client.Properties'
    );

    const state = propertiesItem?.state as DocumentModelState

    properties = state?.data;
  } catch (err) {
    log.warn('Failed to cache properties', err);
  }


  // TODO(burdon): Other stats from internal.data.
  Object.assign(stats, {
    properties: {
      name: properties?.name,
    },
    metrics: space.metrics,
    db: {
      objects: space.dataPipeline.itemManager.entities.size,
    },
    epochs: space.inner.spaceState.credentials.filter(credentialTypeFilter('dxos.halo.credentials.Epoch')).map(credential => ({
      ...credential.subject.assertion,
      id: credential.id,
    })),
    members: Array.from(space.inner.spaceState.members.values()).map((member) => ({
      identity: {
        identityKey: member.key,
        profile: {
          displayName: member.assertion.profile?.displayName,
        },
      },
      presence: space.presence.getPeersOnline().filter(({ identityKey }) => identityKey.equals(member.key)).length > 0
        ? SpaceMember.PresenceState.ONLINE
        : SpaceMember.PresenceState.OFFLINE,
    })),
    pipeline: {
      currentEpoch: space.dataPipeline.currentEpoch,
      appliedEpoch: space.dataPipeline.appliedEpoch,

      controlFeeds: space.inner.controlPipeline.state.feeds.map((feed) => feed.key),
      currentControlTimeframe: space.inner.controlPipeline.state.timeframe,
      targetControlTimeframe: space.inner.controlPipeline.state.targetTimeframe,
      totalControlTimeframe: space.inner.controlPipeline.state.endTimeframe,

      dataFeeds: space.dataPipeline.pipelineState?.feeds.map((feed) => feed.key) ?? [],
      startDataTimeframe: space.dataPipeline.pipelineState?.startTimeframe,
      currentDataTimeframe: space.dataPipeline.pipelineState?.timeframe,
      targetDataTimeframe: space.dataPipeline.pipelineState?.targetTimeframe,
      totalDataTimeframe: space.dataPipeline.pipelineState?.endTimeframe,
    },
  } satisfies Partial<SpaceStats>);

  // TODO(burdon): Factor out.
  if (stats.metrics) {
    const { open, ready } = stats.metrics;
    stats.metrics.startupTime = open && ready && ready.getTime() - open.getTime();
  }

  return stats;
};

const getEpochs = async (service: SpacesService, space: Space): Promise<SpaceStats['epochs']> => {
  const epochs: SpaceStats['epochs'] = [];
  const currentEpoch = space.internal.data.pipeline!.currentEpoch;
  if (currentEpoch) {
    const done = new Trigger();
    const stream = service.queryCredentials({ spaceKey: space.key });
    stream.subscribe(async (credential) => {
      switch (credential.subject.assertion['@type']) {
        case 'dxos.halo.credentials.Epoch': {
          // TODO(burdon): Epoch number is not monotonic?
          const { number, timeframe } = credential.subject.assertion;
          epochs.push({ number, timeframe });
          if (currentEpoch.id && credential.id!.equals(currentEpoch.id)) {
            done.wake();
          }
          break;
        }
      }
    });

    await asyncTimeout(done.wait(), DEFAULT_DIAGNOSTICS_TIMEOUT).catch((err) => {
      log.warn('Epochs take to long to query.');
    });
    stream.close();
  }

  return epochs;
};


const getFirstStreamValue = async <T>(stream: Stream<T>, { timeout = 3_000 }: { timeout?: number } = {}): Promise<T> => {
  const trigger = new Trigger<T>();
  stream.subscribe((value) => trigger.wake(value!));
  try {
    return await trigger.wait({ timeout });
  } finally {
    stream.close();
  }
}