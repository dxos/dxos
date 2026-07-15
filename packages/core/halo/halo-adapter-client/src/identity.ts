//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { type Client } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client/invitations';
import { Identity as HaloIdentity, IdentityError } from '@dxos/halo';
import { IdentityDid } from '@dxos/keys';
import {
  type Device as ClientDevice,
  type Identity as ClientIdentity,
  DeviceKind,
} from '@dxos/protocols/proto/dxos/client/services';

import { makeFlow, streamFromObservable, toShareOptions } from './util';

const toInfo = (identity: ClientIdentity): HaloIdentity.Info => ({
  did: IdentityDid.make(identity.did),
  displayName: identity.profile?.displayName,
});

const toDeviceInfo = (device: ClientDevice): HaloIdentity.DeviceInfo => ({
  key: device.deviceKey.toHex(),
  label: device.profile?.label,
  current: device.kind === DeviceKind.CURRENT,
});

/**
 * Builds the {@link HaloIdentity.Service} implementation over a client's `halo` proxy.
 */
export const makeIdentityService = (client: Client): Context.Tag.Service<HaloIdentity.Service> => ({
  identity: streamFromObservable(client.halo.identity).pipe(
    Stream.map((identity) => (identity ? Option.some(toInfo(identity)) : Option.none())),
  ),

  create: (options) =>
    Effect.tryPromise({
      try: async () =>
        toInfo(
          await client.halo.createIdentity(
            options?.displayName !== undefined ? { displayName: options.displayName } : {},
            options?.deviceLabel !== undefined ? { label: options.deviceLabel } : undefined,
          ),
        ),
      catch: (error) => new IdentityError({ context: { error } }),
    }),

  recover: (args) =>
    Effect.tryPromise({
      try: async () => toInfo(await client.halo.recoverIdentity(args)),
      catch: (error) => new IdentityError({ context: { error } }),
    }),

  updateProfile: (profile) =>
    Effect.tryPromise({
      try: async () => toInfo(await client.halo.updateProfile(profile)),
      catch: (error) => new IdentityError({ context: { error } }),
    }),

  devices: streamFromObservable(client.halo.devices).pipe(Stream.map((devices) => devices.map(toDeviceInfo))),

  share: (options) =>
    Effect.try({
      try: () => makeFlow(client.halo.share(toShareOptions(options)), 'device'),
      catch: (error) => new IdentityError({ context: { error } }),
    }),

  join: (code) =>
    Effect.try({
      try: () => makeFlow(client.halo.join(InvitationEncoder.decode(code)), 'device'),
      catch: (error) => new IdentityError({ context: { error } }),
    }),

  invitations: streamFromObservable(client.halo.invitations).pipe(
    Stream.map((invitations) => invitations.map((invitation) => makeFlow(invitation, 'device'))),
  ),
});

/**
 * Layer providing {@link HaloIdentity.Service} backed by the given client.
 */
export const layerIdentity = (client: Client): Layer.Layer<HaloIdentity.Service> =>
  Layer.succeed(HaloIdentity.Service, makeIdentityService(client));
