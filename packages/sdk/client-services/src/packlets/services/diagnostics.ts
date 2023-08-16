//
// Copyright 2022 DXOS.org
//

import invariant from 'tiny-invariant';

import { getFirstStreamValue } from '@dxos/codec-protobuf';
import { ConfigProto } from '@dxos/config';
import { credentialTypeFilter } from '@dxos/credentials';
import { DocumentModel, DocumentModelState } from '@dxos/document-model';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { STORAGE_VERSION } from '@dxos/protocols';
import {
  Device,
  Identity,
  Metrics,
  Space as SpaceProto,
  SpaceMember,
} from '@dxos/protocols/proto/dxos/client/services';
import { SubscribeToFeedsResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { Epoch } from '@dxos/protocols/proto/dxos/halo/credentials';

import { DXOS_VERSION } from '../../version';
import { DataSpace } from '../spaces';
import { getPlatform, Platform } from './platform';
import { ClientServicesHost } from './service-host';
import { JsonStringifyOptions } from './util';

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

export const createDiagnostics = async (clientServiceHost: ClientServicesHost): Promise<Diagnostics> => {
  // TODO(burdon): Fix private access?
  const serviceContext = clientServiceHost._serviceContext;
  const clientServices = clientServiceHost.services;

  const data: Diagnostics = {
    created: new Date().toISOString(),
    platform: getPlatform(),
    client: {
      version: DXOS_VERSION,
      storage: {
        version: STORAGE_VERSION,
      },
    },

    config: clientServiceHost.config?.values,
  };

  const identity = serviceContext.identityManager.identity;
  if (identity) {
    // Identity.
    data.identity = {
      identityKey: identity.identityKey,
      spaceKey: identity.space.key,
      profile: identity.profileDocument,
    };

    // Devices.
    const { devices } =
      (await getFirstStreamValue(clientServices.DevicesService!.queryDevices(), {
        timeout: DEFAULT_DIAGNOSTICS_TIMEOUT,
      }).catch(() => undefined)) ?? {};
    data.devices = devices;

    // Spaces.
    if (serviceContext.dataSpaceManager) {
      data.spaces = await Promise.all(
        Array.from(serviceContext.dataSpaceManager.spaces.values()).map((space) => getSpaceStats(space)) ?? [],
      );
    }

    // Feeds.
    const { feeds = [] } =
      (await getFirstStreamValue(clientServices.DevtoolsHost!.subscribeToFeeds({}), {
        timeout: DEFAULT_DIAGNOSTICS_TIMEOUT,
      }).catch(() => undefined)) ?? {};
    data.feeds = feeds.map(({ feedKey, bytes, length }) => ({ feedKey, bytes, length }));
  }

  // Trace metrics.
  {
    invariant(clientServices.LoggingService, 'SystemService is not available.');
    data.metrics = await getFirstStreamValue(clientServices.LoggingService.queryMetrics({}), {
      timeout: DEFAULT_DIAGNOSTICS_TIMEOUT,
    }).catch(() => undefined);
  }

  return data;
};

const getProperties = (space: DataSpace) => {
  let properties: any = {};
  try {
    // Add properties to cache.
    const propertiesItem = space.dataPipeline.itemManager.items.find(
      (item) =>
        item.modelMeta?.type === DocumentModel.meta.type &&
        (item.state as DocumentModelState)?.type === 'dxos.sdk.client.Properties',
    );

    const state = propertiesItem?.state as DocumentModelState;
    properties = state?.data;
  } catch (err: any) {
    log.warn(err.message);
  }

  return properties;
};

// TODO(burdon): Normalize for ECHO/HALO.
const getSpaceStats = async (space: DataSpace): Promise<SpaceStats> => {
  // TODO(dmaretskyi): Metrics for halo space.
  const stats: SpaceStats = {
    properties: getProperties(space),
    metrics: space.metrics,
    db: {
      objects: space.dataPipeline.itemManager.entities.size,
    },
    epochs: space.inner.spaceState.credentials
      .filter(credentialTypeFilter('dxos.halo.credentials.Epoch'))
      .map((credential) => ({
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
      presence:
        space.presence.getPeersOnline().filter(({ identityKey }) => identityKey.equals(member.key)).length > 0
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
  };

  // TODO(burdon): Factor out.
  if (stats.metrics) {
    const { open, ready } = stats.metrics;
    stats.metrics.startupTime = open && ready && ready.getTime() - open.getTime();
  }

  return stats;
};
