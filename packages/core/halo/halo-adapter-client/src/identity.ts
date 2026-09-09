//
// Copyright 2026 DXOS.org
//

import { type JsonObject, create } from '@bufbuild/protobuf';
import { anyPack, anyUnpack } from '@bufbuild/protobuf/wkt';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { type Client } from '@dxos/client';
import { type RecoverIdentityArgs } from '@dxos/client-protocol';
import { createEdgeIdentity } from '@dxos/client/edge';
import { InvitationEncoder } from '@dxos/client/invitations';
import { createIdFromSpaceKey } from '@dxos/echo-protocol';
import { Identity as HaloIdentity, IdentityError } from '@dxos/halo';
import { IdentityDid, PublicKey } from '@dxos/keys';
import { fromDate, fromPublicKey, requirePublicKey, toDate, toPublicKey } from '@dxos/protocols/buf';
import {
  type Device as ClientDevice,
  type Identity as ClientIdentity,
  DeviceKind,
  Device_PresenceState,
  RecoverIdentityRequest_ExternalSignatureSchema,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import {
  type Credential,
  CredentialSchema,
  DeviceProfileDocumentSchema,
  DeviceType,
  IdentityRecoverySchema,
  IdentityRecoveryRevokedSchema,
  IdentityRecovery_Kind,
  ProfileDocumentSchema,
  ServiceAccessSchema,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { ComplexSet } from '@dxos/util';

import { makeFlow, streamFromClientObservable, toShareOptions } from './util';

/**
 * Narrows arbitrary profile metadata to what a `google.protobuf.Struct` can carry.
 *
 * The HALO surface declares `data` as `Record<string, unknown>`, so a non-JSON value has to be
 * dropped here rather than asserted away.
 */
const toJsonObject = (data: Record<string, unknown>): JsonObject => JSON.parse(JSON.stringify(data));

const toInfo = (identity: ClientIdentity): HaloIdentity.Info => ({
  did: IdentityDid.make(identity.did),
  identityKey: toPublicKey(identity.identityKey)?.toHex(),
  displayName: identity.profile?.displayName,
  data: identity.profile?.data,
});

const DEVICE_KINDS: Record<DeviceType, HaloIdentity.DeviceKind> = {
  [DeviceType.UNKNOWN]: 'unknown',
  [DeviceType.BROWSER]: 'browser',
  [DeviceType.NATIVE]: 'native',
  [DeviceType.MOBILE]: 'mobile',
  [DeviceType.AGENT]: 'agent',
  [DeviceType.AGENT_MANAGED]: 'agent-managed',
};

const PRESENCE: Record<Device_PresenceState, HaloIdentity.Presence> = {
  [Device_PresenceState.ONLINE]: 'online',
  [Device_PresenceState.OFFLINE]: 'offline',
  [Device_PresenceState.REMOVED]: 'removed',
};

const toDeviceInfo = (device: ClientDevice): HaloIdentity.DeviceInfo => ({
  key: requirePublicKey(device.deviceKey).toHex(),
  kind: device.profile?.type !== undefined ? DEVICE_KINDS[device.profile.type] : undefined,
  label: device.profile?.label,
  os: device.profile?.os,
  platform: device.profile?.platform,
  current: device.kind === DeviceKind.CURRENT,
  presence: PRESENCE[device.presence],
});

const RECOVERY_KINDS: Record<IdentityRecovery_Kind, HaloIdentity.RecoveryKind> = {
  [IdentityRecovery_Kind.UNKNOWN]: 'unknown',
  [IdentityRecovery_Kind.PASSKEY]: 'passkey',
  [IdentityRecovery_Kind.RECOVERY_CODE]: 'recovery-code',
  [IdentityRecovery_Kind.OAUTH]: 'oauth',
};

const RECOVERY_KIND_VALUES: Record<HaloIdentity.RecoveryKind, IdentityRecovery_Kind> = {
  'unknown': IdentityRecovery_Kind.UNKNOWN,
  'passkey': IdentityRecovery_Kind.PASSKEY,
  'recovery-code': IdentityRecovery_Kind.RECOVERY_CODE,
  'oauth': IdentityRecovery_Kind.OAUTH,
};

/**
 * The assertion's fully-qualified proto name, which this surface publishes as the credential type.
 *
 * A packed `Any` carries it as a type URL, and unpacking every assertion type here only to read a
 * name the URL already spells out would couple this adapter to the whole assertion registry.
 */
const assertionTypeName = (typeUrl: string | undefined): string => typeUrl?.split('/').pop() ?? '';

const toCredential = (credential: Credential, revoked: ComplexSet<PublicKey>): HaloIdentity.Credential => {
  const assertion = credential.subject?.assertion;
  const recovery = assertion && anyUnpack(assertion, IdentityRecoverySchema);
  const lookupKey = toPublicKey(recovery?.lookupKey);
  return {
    id: toPublicKey(credential.id)?.toHex(),
    type: assertionTypeName(assertion?.typeUrl),
    issuanceDate: toDate(credential.issuanceDate),
    recovery: recovery && {
      lookupKey: lookupKey?.toHex(),
      label: recovery.label,
      kind: RECOVERY_KINDS[recovery.kind ?? IdentityRecovery_Kind.UNKNOWN],
      revoked: !!lookupKey && revoked.has(lookupKey),
    },
  };
};

/**
 * Lookup keys cancelled by an `IdentityRecoveryRevoked` assertion. Collected over the whole feed
 * before mapping, since a revocation is always written after the credential it cancels.
 */
const collectRevoked = (credentials: readonly Credential[]): ComplexSet<PublicKey> => {
  const revoked = new ComplexSet<PublicKey>(PublicKey.hash);
  for (const credential of credentials) {
    const assertion = credential.subject?.assertion;
    const lookupKey = assertion && toPublicKey(anyUnpack(assertion, IdentityRecoveryRevokedSchema)?.lookupKey);
    if (lookupKey) {
      revoked.add(lookupKey);
    }
  }
  return revoked;
};

/**
 * The recovery verbs have no `halo` proxy method, so they go straight to the service; absence means
 * the client was built without identity support rather than a runtime failure.
 */
const getIdentityService = (client: Client) => {
  const identityService = client.services.services.IdentityService;
  if (!identityService) {
    throw new Error('IdentityService not available.');
  }
  return identityService;
};

const toRecoverRequest = (args: HaloIdentity.RecoverArgs): RecoverIdentityArgs => {
  if (!('passkey' in args)) {
    return args;
  }
  const { challenge, lookupKey, signature, clientDataJson, authenticatorData } = args.passkey;
  return {
    external: create(RecoverIdentityRequest_ExternalSignatureSchema, {
      lookupKey: fromPublicKey(PublicKey.fromHex(lookupKey)),
      deviceKey: fromPublicKey(PublicKey.fromHex(challenge.deviceKey)),
      controlFeedKey: fromPublicKey(PublicKey.fromHex(challenge.controlFeedKey)),
      signature,
      clientDataJson,
      authenticatorData,
    }),
  };
};

/**
 * Builds the {@link HaloIdentity.Service} implementation over a client's `halo` proxy.
 */
export const makeIdentityService = (client: Client): Context.Service.Shape<typeof HaloIdentity.Service> => ({
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
            create(ProfileDocumentSchema, {
              ...(options?.displayName !== undefined && { displayName: options.displayName }),
              ...(options?.data !== undefined && { data: toJsonObject(options.data) }),
            }),
            options?.deviceLabel !== undefined
              ? create(DeviceProfileDocumentSchema, { label: options.deviceLabel })
              : undefined,
          ),
        ),
      catch: (error) => new IdentityError({ context: { error } }),
    }),

  personalSpaceId: Effect.tryPromise({
    try: async () => {
      // Same pre-initialization contract as `getSnapshot`: none means "unknown", not "absent".
      const spaceKey = client.initialized ? client.halo.identity.get()?.spaceKey : undefined;
      const key = toPublicKey(spaceKey);
      return key ? Option.some(await createIdFromSpaceKey(key)) : Option.none();
    },
    catch: (error) => new IdentityError({ context: { error } }),
  }),

  recover: (args) =>
    Effect.tryPromise({
      try: async () => toInfo(await client.halo.recoverIdentity(toRecoverRequest(args))),
      catch: (error) => new IdentityError({ context: { error } }),
    }),

  createRecoveryCredential: (options) =>
    Effect.tryPromise({
      try: async () => {
        const externalKey = options?.externalKey;
        const { recoveryCode } = await getIdentityService(client).createRecoveryCredential(
          externalKey
            ? {
                data: {
                  recoveryKey: PublicKey.fromHex(externalKey.recoveryKey),
                  lookupKey: PublicKey.fromHex(externalKey.lookupKey),
                  algorithm: externalKey.algorithm,
                  label: externalKey.label,
                  kind: externalKey.kind && RECOVERY_KIND_VALUES[externalKey.kind],
                },
              }
            : {},
        );
        return recoveryCode !== undefined ? { recoveryCode } : {};
      },
      catch: (error) => new IdentityError({ context: { error } }),
    }),

  requestRecoveryChallenge: Effect.tryPromise({
    try: async () => {
      const { deviceKey, controlFeedKey, challenge } = await getIdentityService(client).requestRecoveryChallenge();
      return { deviceKey: deviceKey.toHex(), controlFeedKey: controlFeedKey.toHex(), challenge };
    },
    catch: (error) => new IdentityError({ context: { error } }),
  }),

  revokeRecoveryCredential: (lookupKey) =>
    Effect.tryPromise({
      try: async () => {
        await getIdentityService(client).revokeRecoveryCredential({ lookupKey: PublicKey.fromHex(lookupKey) });
      },
      catch: (error) => new IdentityError({ context: { error } }),
    }),

  updateProfile: (profile) =>
    Effect.tryPromise({
      try: async () =>
        toInfo(
          await client.halo.updateProfile(
            create(ProfileDocumentSchema, {
              displayName: profile.displayName,
              data: profile.data && toJsonObject(profile.data),
            }),
          ),
        ),
      catch: (error) => new IdentityError({ context: { error } }),
    }),

  devices: streamFromClientObservable(client, () => client.halo.devices).pipe(
    Stream.map((devices) => devices.map(toDeviceInfo)),
  ),

  // Empty pre-initialization for the same reason `getSnapshot` is `none`: `client.halo` throws
  // before `initialize()`, and the contract for a pre-init read on this surface is silence.
  getDevicesSnapshot: () => (client.initialized ? client.halo.devices.get().map(toDeviceInfo) : []),

  getEdgeIdentity: () => {
    // `createEdgeIdentity` throws when either is missing; none is the contract on this surface.
    if (!client.initialized || !client.halo.identity.get() || !client.halo.device) {
      return Option.none();
    }
    return Option.some(createEdgeIdentity(client));
  },

  credentials: streamFromClientObservable(client, () => client.halo.credentials).pipe(
    Stream.map((credentials) => {
      const revoked = collectRevoked(credentials);
      return credentials.map((credential) => toCredential(credential, revoked));
    }),
  ),

  grantServiceAccess: (options) =>
    Effect.tryPromise({
      try: async () => {
        const identityKey = client.halo.identity.get()?.identityKey;
        if (!identityKey) {
          throw new Error('No identity.');
        }
        await client.halo.writeCredentials([
          create(CredentialSchema, {
            issuer: identityKey,
            issuanceDate: fromDate(new Date()),
            subject: {
              id: identityKey,
              assertion: anyPack(
                ServiceAccessSchema,
                create(ServiceAccessSchema, {
                  serverName: options.serverName,
                  serverKey: identityKey,
                  identityKey,
                  capabilities: [...options.capabilities],
                }),
              ),
            },
          }),
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
