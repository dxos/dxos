//
// Copyright 2022 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type QueryExecutorMode } from '@dxos/echo-host';
import { type SignalManager } from '@dxos/messaging';
import { type TransportFactory } from '@dxos/network-manager';
import { type Runtime_Client_EdgeFeatures } from '@dxos/protocols/buf/dxos/config_pb';

import * as IdentityContract from '../../contracts/identity.ts';
import { type DataSpaceManagerRuntimeProps } from '../echo/spaces/index.ts';
import { type IdentityManagerProps, identityProviderFromManager } from '../halo/identity/index.ts';
import { type InvitationConnectionProps } from '../halo/invitations/index.ts';

export type ServiceContextRuntimeProps = Pick<
  IdentityManagerProps,
  'devicePresenceOfflineTimeout' | 'devicePresenceAnnounceInterval'
> &
  DataSpaceManagerRuntimeProps & {
    invitationConnectionDefaultProps?: InvitationConnectionProps;
    disableP2pReplication?: boolean;
    /** Query evaluation path for every host query; see `QueryExecutorMode`. */
    queryExecutor?: QueryExecutorMode;
    enableVectorIndexing?: boolean;
  };

export type ServiceStackServices = ServiceContextRuntimeProps & {
  edgeFeatures?: Runtime_Client_EdgeFeatures;
  connectionLog?: boolean;
  autoConnect?: boolean;
  /**
   * Whether an edge endpoint is configured. An edge feature can be enabled in config without one,
   * so the feature flag alone does not say whether an edge-dependent spec can be built.
   */
  edgeAvailable?: boolean;
  /** Overrides the config-derived signal manager; tests pass an in-memory one. */
  signalManager?: SignalManager;
  /** Overrides the WebRTC transport; tests pass the in-memory transport. */
  transportFactory?: TransportFactory;
};

/**
 * Provides the {@link IdentityProviderService} from the resolved {@link IdentityContract.Manager}.
 */
export const identityProviderLayer = Layer.effect(
  IdentityContract.ProviderService,
  Effect.gen(function* () {
    const identityManager = yield* IdentityContract.ManagerService;
    return identityProviderFromManager(identityManager);
  }),
);
