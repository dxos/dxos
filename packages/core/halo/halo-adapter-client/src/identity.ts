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
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

import { makeFlow, streamFromClientObservable, toShareOptions } from './util';

const toInfo = (identity: ClientIdentity): HaloIdentity.Info => ({
  did: IdentityDid.make(identity.did),
  identityKey: identity.identityKey?.toHex(),
  displayName: identity.profile?.displayName,
  data: identity.profile?.data,
});

const toDeviceInfo = (device: ClientDevice): HaloIdentity.DeviceInfo => ({
  key: device.deviceKey.toHex(),
  label: device.profile?.label,
  current: device.kind === DeviceKind.CURRENT,
});

const toCredential = (credential: Credential): HaloIdentity.Credential => ({
  id: credential.id?.toHex(),
  type: credential.subject.assertion['@type'],
  issuanceDate: credential.issuanceDate,
});

/**
 * Builds the {@link HaloIdentity.Service} implementation over a client's `halo` proxy.
 */
export const makeIdentityService = (client: Client): Context.Tag.Service<HaloIdentity.Service> => ({
  identity: streamFromClientObservable(client, () => client.halo.identity).pipe(
    Stream.map((identity) => (identity ? Option.some(toInfo(identity)) : Option.none())),
  ),

  getSnapshot: () => {
    // Pre-initialization there is no trustworthy reading; none here means "unknown", and
    // identity-gated flows must use the stream (silent until initialization) or suspend —
    // acting on a pre-init none would misread an existing identity as absent.
    if (!client.initialized) {
      return Option.none();
    }
    const identity = client.halo.identity.get();
    return identity ? Option.some(toInfo(identity)) : Option.none();
  },

  subscribe: (callback) => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    // Register once initialization completes; the subscription fires with the current value,
    // so a late registration still delivers the first reading.
    void client.waitUntilInitialized().then(() => {
      if (cancelled) {
        return;
      }
      const subscription = client.halo.identity.subscribe((identity) =>
        callback(identity ? Option.some(toInfo(identity)) : Option.none()),
      );
      unsubscribe = () => subscription.unsubscribe();
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  },

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

  devices: streamFromClientObservable(client, () => client.halo.devices).pipe(
    Stream.map((devices) => devices.map(toDeviceInfo)),
  ),

  getDevicesSnapshot: () => client.halo.devices.get().map(toDeviceInfo),

  credentials: streamFromClientObservable(client, () => client.halo.credentials).pipe(
    Stream.map((credentials) => credentials.map(toCredential)),
  ),

  grantServiceAccess: (options) =>
    Effect.tryPromise({
      try: async () => {
        const identityKey = client.halo.identity.get()?.identityKey;
        if (!identityKey) {
          throw new Error('No identity.');
        }
        await client.halo.writeCredentials([
          {
            issuer: identityKey,
            issuanceDate: new Date(),
            subject: {
              id: identityKey,
              assertion: {
                '@type': 'dxos.halo.credentials.ServiceAccess',
                'serverName': options.serverName,
                'serverKey': identityKey,
                identityKey,
                'capabilities': [...options.capabilities],
              },
            },
          },
        ]);
      },
      catch: (error) => new IdentityError({ context: { error } }),
    }),

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

  invitations: streamFromClientObservable(client, () => client.halo.invitations).pipe(
    Stream.map((invitations) => invitations.map((invitation) => makeFlow(invitation, 'device'))),
  ),
});

/**
 * Layer providing {@link HaloIdentity.Service} backed by the given client.
 */
export const layerIdentity = (client: Client): Layer.Layer<HaloIdentity.Service> =>
  Layer.succeed(HaloIdentity.Service, makeIdentityService(client));
