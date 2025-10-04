//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { type Client, type ClientServices } from '@dxos/client';
import { DeviceKind } from '@dxos/client/halo';

import { type DataProvider } from '../observability';

// TODO(wittjosiah): Improve privacy of telemetry identifiers. See `getTelemetryIdentifier`.
export const identityProvider = (clientServices: Partial<ClientServices>): DataProvider =>
  Effect.fn(function* (observability) {
    if (clientServices.IdentityService) {
      // TODO(wittjosiah): Currently cannot unsubscribe from this subscription.
      clientServices.IdentityService.queryIdentity().subscribe((idqr) => {
        if (!idqr?.identity?.did) {
          return;
        }

        observability.identify(idqr.identity.did);
        observability.setTags({ did: idqr.identity.did });
      });
    }

    if (clientServices.DevicesService) {
      // TODO(wittjosiah): Currently cannot unsubscribe from this subscription.
      clientServices.DevicesService.queryDevices().subscribe((dqr) => {
        if (!dqr?.devices || dqr.devices.length === 0) {
          return;
        }

        const thisDevice = dqr.devices.find((device) => device.kind === DeviceKind.CURRENT);
        if (!thisDevice) {
          return;
        }

        observability.setTags({ deviceKey: thisDevice.deviceKey.truncate() });
        if (thisDevice.profile?.label) {
          observability.setTags({ deviceProfile: thisDevice.profile.label });
        }
      });
    }
  });

export const networkMetricsProvider = (clientServices: Partial<ClientServices>): DataProvider =>
  Effect.fn(function* (observability) {
    // TODO(wittjosiah): Migrate.
  });

export const runtimeMetricsProvider = (clientServices: Partial<ClientServices>): DataProvider =>
  Effect.fn(function* (observability) {
    // TODO(wittjosiah): Migrate.
  });

export const spacesMetricsProvider = (client: Client): DataProvider =>
  Effect.fn(function* (observability) {
    // TODO(wittjosiah): Migrate.
  });
