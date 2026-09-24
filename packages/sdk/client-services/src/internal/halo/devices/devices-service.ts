//
// Copyright 2022 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as EffectStream from 'effect/Stream';

import { SubscriptionList } from '@dxos/async';
import { RegisterService } from '@dxos/client-protocol';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { type EdgeConnection, EdgeConnectionService } from '@dxos/edge-client';
import { EffectEx } from '@dxos/effect';
import { BaseError } from '@dxos/errors';
import { invariant } from '@dxos/invariant';
import { toServiceError } from '@dxos/protocols';
import { buf, fromPublicKey } from '@dxos/protocols/buf';
import {
  type Device,
  Device_PresenceState,
  DeviceKind,
  DeviceSchema,
  EdgeStatus_ConnectionState,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { type DeviceProfileDocument } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { DevicesService } from '@dxos/protocols/rpc';
import { RpcRouter } from '@dxos/rpc';

import * as IdentityContract from '../../../contracts/identity.ts';

export class DevicesServiceImpl implements DevicesService.Handlers {
  'constructor'(
    private readonly _identityManager: IdentityContract.Manager,
    private readonly _edgeConnection?: EdgeConnection,
  ) {}

  ['DevicesService.updateDevice'](request: DeviceProfileDocument): Effect.Effect<Device, BaseError> {
    return Effect.tryPromise({
      try: async () => await this._identityManager.updateDeviceProfile(request),
      catch: toServiceError,
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
                  this._edgeConnection?.status.state === EdgeStatus_ConnectionState.CONNECTED
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

export const DevicesServiceLayer = Layer.effect(
  DevicesService.Tag,
  Effect.gen(function* () {
    const identityManager = yield* IdentityContract.ManagerService;
    // Edge connection is absent in the non-edge stack, so resolve it optionally.
    const edgeConnection = Option.getOrUndefined(yield* Effect.serviceOption(EdgeConnectionService));
    return new DevicesServiceImpl(identityManager, edgeConnection);
  }),
);

export const DevicesServiceSpec = LayerSpec.make(
  { affinity: 'application', requires: [IdentityContract.ManagerService], provides: [DevicesService.Tag] },
  () => DevicesServiceLayer,
);

export const DevicesServiceRegistrationSpec = LayerSpec.make(
  { affinity: 'application', requires: [DevicesService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
  () => RegisterService(DevicesService.Rpcs, DevicesService.Tag),
);
