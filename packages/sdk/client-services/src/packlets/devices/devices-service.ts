//
// Copyright 2022 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { SubscriptionList } from '@dxos/async';
import { type EdgeConnection } from '@dxos/edge-client';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { buf, fromPublicKey } from '@dxos/protocols/buf';
import { encodeCompat } from '@dxos/protocols/buf-shape-compat';
import {
  type Device,
  Device_PresenceState,
  DeviceKind,
  DeviceSchema,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { EdgeStatus, type Device as LegacyDevice } from '@dxos/protocols/buf/dxos/client/services_pb';
import { type DeviceProfileDocument } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type DevicesService } from '@dxos/protocols/rpc';

import { type IdentityManager } from '../identity';

/** Reads a device from the identity manager as the buf message the service returns. */
const toBufDevice = (device: LegacyDevice): Device => buf.fromBinary(DeviceSchema, encodeCompat(DeviceSchema, device));

export class DevicesServiceImpl implements DevicesService.Handlers {
  'constructor'(
    private readonly _identityManager: IdentityManager,
    private readonly _edgeConnection?: EdgeConnection,
  ) {}

  ['DevicesService.updateDevice'](request: DeviceProfileDocument): Effect.Effect<Device, Error> {
    return Effect.tryPromise({
      try: async () => toBufDevice(await this._identityManager.updateDeviceProfile(request)),
      catch: (error) => error as Error,
    });
  }

  ['DevicesService.queryDevices'](): EffectStream.Stream<DevicesService.QueryDevicesResponse, Error> {
    return EffectEx.streamFromEmitter<DevicesService.QueryDevicesResponse, Error>((emit) => {
      const update = () => {
        const deviceKeys = this._identityManager.identity?.authorizedDeviceKeys;
        if (!deviceKeys) {
          void emit.single({ devices: [] });
        } else {
          invariant(this._identityManager.identity?.presence, 'presence not present');
          const identityPresence = this._identityManager.identity.presence;
          void emit.single({
            devices: Array.from(deviceKeys.entries()).map(([key, profile]) => {
              const isMe = this._identityManager.identity?.deviceKey.equals(key);
              let presence;
              if (isMe) {
                presence = Device_PresenceState.ONLINE;
              } else if (profile.os?.toUpperCase() === 'EDGE') {
                presence =
                  this._edgeConnection?.status.state === EdgeStatus.ConnectionState.CONNECTED
                    ? Device_PresenceState.ONLINE
                    : Device_PresenceState.OFFLINE;
              } else {
                presence =
                  identityPresence.getPeersByIdentityKey(key).length > 0
                    ? Device_PresenceState.ONLINE
                    : Device_PresenceState.OFFLINE;
              }

              return buf.create(DeviceSchema, {
                deviceKey: fromPublicKey(key),
                kind: this._identityManager.identity?.deviceKey.equals(key) ? DeviceKind.CURRENT : DeviceKind.TRUSTED,
                profile: profile,
                presence,
              });
            }),
          });
        }
      };

      let identitySubscribed = false;
      let presenceSubscribed = false;
      const subscribeIdentity = () => {
        if (!identitySubscribed) {
          this._identityManager.identity?.stateUpdate.on(() => {
            update();
          });
          identitySubscribed = true;
        }
      };

      const subscribePresence = () => {
        if (!presenceSubscribed) {
          this._identityManager.identity?.presence?.updated.on(() => {
            update();
          });
          presenceSubscribed = true;
        }
      };

      const subscriptions = new SubscriptionList();

      if (this._identityManager.identity) {
        subscribeIdentity();
        subscribePresence();
      }

      subscriptions.add(
        this._identityManager.stateUpdate.on(() => {
          update();

          if (this._identityManager.identity) {
            subscribeIdentity();
            subscribePresence();
          }
        }),
      );

      update();

      return Effect.sync(() => subscriptions.clear());
    });
  }
}
