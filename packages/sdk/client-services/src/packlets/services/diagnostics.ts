//
// Copyright 2022 DXOS.org
//

import { ClientServices } from '@dxos/client-protocol';
import { getFirstStreamValue } from '@dxos/codec-protobuf';
import { Config, ConfigProto } from '@dxos/config';
import { credentialTypeFilter } from '@dxos/credentials';
import { DocumentModel, DocumentModelState } from '@dxos/document-model';
import { invariant } from '@dxos/invariant';
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
import { ServiceContext } from './service-context';

const DEFAULT_TIMEOUT = 1_000;

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
  key: PublicKey;
  properties?: {
    name: string;
  };
  db?: {
    objects: number;
  };
  metrics?: SpaceProto.Metrics & {
    startupTime?: number;
  };
  epochs?: (Epoch & { id?: PublicKey })[];
  members?: SpaceMember[];
  pipeline?: SpaceProto.PipelineState;
};

/**
 * Create diagnostics to provide snapshot of current system state.
 */
export const createDiagnostics = async (
  clientServices: Partial<ClientServices>,
  serviceContext: ServiceContext,
  config: Config,
): Promise<Diagnostics> => {
  const diagnostics: Diagnostics = {
    created: new Date().toISOString(),
    platform: getPlatform(),
    client: {
      version: DXOS_VERSION,
      storage: {
        version: STORAGE_VERSION,
      },
    },
  };

  // Trace metrics.
  // TODO(burdon): Move here from logging service?
  {
    invariant(clientServices.LoggingService, 'SystemService is not available.');
    diagnostics.metrics = await getFirstStreamValue(clientServices.LoggingService.queryMetrics({}), {
      timeout: DEFAULT_TIMEOUT,
    }).catch(() => undefined);
  }

  const identity = serviceContext.identityManager.identity;
  if (identity) {
    // Identity.
    diagnostics.identity = {
      identityKey: identity.identityKey,
      spaceKey: identity.space.key,
      profile: identity.profileDocument,
    };

    // Devices.
    const { devices } =
      (await getFirstStreamValue(clientServices.DevicesService!.queryDevices(), {
        timeout: DEFAULT_TIMEOUT,
      }).catch(() => undefined)) ?? {};
    diagnostics.devices = devices;

    // TODO(dmaretskyi): Add metrics for halo space.

    // Spaces.
    if (serviceContext.dataSpaceManager) {
      diagnostics.spaces = await Promise.all(
        Array.from(serviceContext.dataSpaceManager.spaces.values()).map((space) => getSpaceStats(space)) ?? [],
      );
    }

    // Feeds.
    const { feeds = [] } =
      (await getFirstStreamValue(clientServices.DevtoolsHost!.subscribeToFeeds({}), {
        timeout: DEFAULT_TIMEOUT,
      }).catch(() => undefined)) ?? {};
    diagnostics.feeds = feeds.map(({ feedKey, bytes, length }) => ({ feedKey, bytes, length }));
  }

  diagnostics.config = config.values;

  return diagnostics;
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

const getSpaceStats = async (space: DataSpace): Promise<SpaceStats> => {
  const stats: SpaceStats = {
    key: space.key,
    metrics: space.metrics,

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
      // TODO(burdon): Pick properties from credentials if needed.
      // currentEpoch: space.dataPipeline.currentEpoch,
      // appliedEpoch: space.dataPipeline.appliedEpoch,

      controlFeeds: space.inner.controlPipeline.state.feeds.map((feed) => feed.key),
      currentControlTimeframe: space.inner.controlPipeline.state.timeframe,
      targetControlTimeframe: space.inner.controlPipeline.state.targetTimeframe,
      totalControlTimeframe: space.inner.controlPipeline.state.endTimeframe,

      // TODO(burdon): Empty?
      dataFeeds: space.dataPipeline.pipelineState?.feeds.map((feed) => feed.key) ?? [],
      startDataTimeframe: space.dataPipeline.pipelineState?.startTimeframe,
      currentDataTimeframe: space.dataPipeline.pipelineState?.timeframe,
      targetDataTimeframe: space.dataPipeline.pipelineState?.targetTimeframe,
      totalDataTimeframe: space.dataPipeline.pipelineState?.endTimeframe,
    },
  };

  // TODO(burdon): May not be open?
  if (space.dataPipeline.itemManager) {
    Object.assign(stats, {
      properties: getProperties(space),
      db: {
        objects: space.dataPipeline.itemManager.entities.size,
      },
    } as SpaceStats);
  }

  // TODO(burdon): Factor out.
  if (stats.metrics) {
    const { open, ready } = stats.metrics;
    stats.metrics.startupTime = open && ready && ready.getTime() - open.getTime();
  }

  return stats;
};
