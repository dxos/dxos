//
// Copyright 2026 DXOS.org
//

import { buf, bufWkt } from '@dxos/protocols/buf';
import { TimeframeVectorSchema, TimeframeVector_FrameSchema } from '@dxos/protocols/buf/dxos/echo/timeframe_pb';
import {
  AdmittedFeedSchema,
  AuthSchema,
  AuthorizedDeviceSchema,
  type Credential,
  CredentialSchema,
  DeviceProfileDocumentSchema,
  DeviceProfileSchema,
  EpochSchema,
  IdentityRecoverySchema,
  ProfileDocumentSchema,
  type Proof,
  ServiceAccessSchema,
  SpaceGenesisSchema,
  SpaceMemberSchema,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import {
  CancelDelegatedInvitationSchema,
  DelegateSpaceInvitationSchema,
} from '@dxos/protocols/buf/dxos/halo/invitations_pb';
import { Timeframe } from '@dxos/timeframe';
import { deepMapValues } from '@dxos/util';

// Encode-direction port of `@dxos/edge-protocol`'s credential-codec. The dxos monorepo does not
// ship the protobufjs<->buf-es bridge (it lives in the edge repo), but the OAuth recovery
// registration flow needs to serialize a protobufjs SpaceGenesis credential into the base64
// buf-es `CredentialSchema` binary that kms-service decodes via `buf.fromBinary`.
// TODO(wittjosiah): Extract a shared codec package so edge-protocol can re-export it.

const SUPPORTED_ASSERTION_SCHEMAS: buf.DescMessage[] = [
  AuthorizedDeviceSchema,
  SpaceMemberSchema,
  AdmittedFeedSchema,
  AuthSchema,
  ServiceAccessSchema,
  SpaceGenesisSchema,
  IdentityRecoverySchema,
  DelegateSpaceInvitationSchema,
  CancelDelegatedInvitationSchema,
  DeviceProfileSchema,
  DeviceProfileDocumentSchema,
  EpochSchema,
];

const SCHEMA_REGISTRY = Object.fromEntries(SUPPORTED_ASSERTION_SCHEMAS.map((schema) => [schema.typeName, schema]));

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
};

/**
 * Removes undefined properties so protobuf implicit list/map fields are not present as
 * `undefined` (bufbuild v2 unsafeIsSet throws when reading .length / Object.keys on undefined).
 */
const omitUndefinedDeep = (value: unknown): unknown => {
  if (value === undefined) {
    return value;
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date || value instanceof Uint8Array || value instanceof Timeframe) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => omitUndefinedDeep(item));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (nested === undefined) {
      continue;
    }
    result[key] = omitUndefinedDeep(nested);
  }
  return result;
};

const mapDatesToBufTimestamps = (object: any) => {
  return deepMapValues(object, (value: any, recurse: any) => {
    if (value instanceof Date) {
      return bufWkt.timestampFromDate(value);
    }
    if (value instanceof Uint8Array) {
      return value;
    }
    if (value instanceof Timeframe) {
      return value;
    }
    return recurse(value);
  });
};

const dateToTimestamp = (date: Date | undefined) => {
  if (!date) {
    return undefined;
  }
  return bufWkt.timestampFromDate(date);
};

const getSchema = (typeUrl: string) => {
  const schema = SCHEMA_REGISTRY[typeUrl];
  if (!schema) {
    throw new Error(`Unexpected schema: ${typeUrl}.`);
  }
  return schema;
};

const getAssertionType = (credential: Credential) => {
  if (!credential.subject?.assertion) {
    return undefined;
  }
  if ('typeUrl' in credential.subject.assertion) {
    return (credential.subject.assertion as any).typeUrl;
  }
  return (credential.subject.assertion as any)['@type'];
};

const createBufAssertion = (credential: Credential) => {
  const typeUrl = getAssertionType(credential);
  const schema = getSchema(typeUrl);
  const rawAssertion = mapDatesToBufTimestamps(credential.subject!.assertion) as Record<string, unknown>;
  delete rawAssertion['@type'];
  const assertion: any = omitUndefinedDeep(rawAssertion) as Record<string, unknown>;

  if (typeUrl === EpochSchema.typeName && assertion.timeframe instanceof Timeframe) {
    assertion.timeframe = buf.create(TimeframeVectorSchema, {
      frames: (assertion.timeframe as Timeframe)?.frames().map(([feedKey, seq]) =>
        buf.create(TimeframeVector_FrameSchema, {
          feedKey: feedKey.asUint8Array(),
          seq,
        }),
      ),
    });
  }
  if (typeUrl === DeviceProfileSchema.typeName) {
    assertion.profile = buf.create(DeviceProfileDocumentSchema, assertion.profile);
  }
  if (typeUrl === SpaceMemberSchema.typeName) {
    if (assertion.tags == null) {
      assertion.tags = [];
    }
    if (assertion.profile != null) {
      assertion.profile = buf.create(ProfileDocumentSchema, omitUndefinedDeep(assertion.profile) as any);
    }
  }
  const packed = bufWkt.anyPack(schema, buf.create(schema, assertion));
  packed.typeUrl = packed.typeUrl.split('/')[1]; // Strip type.googleapis.com/
  return packed;
};

const plainObjectToBufProof = (proof: Proof): Proof => {
  return {
    type: proof.type,
    value: Buffer.from(proof.value),
    creationDate: dateToTimestamp(proof.creationDate as any),
    signer: { data: proof.signer!.data },
    nonce: proof.nonce,
    ...(proof?.chain ? { chain: { credential: plainObjectToBufCredential(proof.chain.credential!) } } : undefined),
  } as any;
};

const plainObjectToBufCredential = (credential: Credential): Credential => {
  if (credential.$typeName === CredentialSchema.typeName) {
    return credential;
  }

  return buf.create(CredentialSchema, {
    id: credential.id,
    issuer: credential.issuer,
    issuanceDate: dateToTimestamp(credential.issuanceDate as any),
    expirationDate: dateToTimestamp(credential.expirationDate as any),
    subject: { id: credential.subject!.id, assertion: createBufAssertion(credential) as any },
    proof: plainObjectToBufProof(credential.proof!),
    parentCredentialIds: credential.parentCredentialIds ?? [],
  });
};

/** Encode a protobufjs (plain object) credential into base64 buf-es `CredentialSchema` binary. */
export const plainCredentialToBase64 = (credential: Credential): string => {
  const binary = buf.toBinary(CredentialSchema, plainObjectToBufCredential(credential));
  return Buffer.from(binary).toString('base64');
};
