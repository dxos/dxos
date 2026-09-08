//
// Copyright 2026 DXOS.org
//

import { type RecoverIdentityArgs } from '@dxos/client-protocol';
import { buf } from '@dxos/protocols/buf';
import { decodeCompat, encodeCompat } from '@dxos/protocols/buf-shape-compat';
import {
  type Contact,
  ContactSchema,
  type Device,
  DeviceSchema,
  type Identity,
  IdentitySchema,
  type RecoverIdentityRequest,
  RecoverIdentityRequest_ExternalSignatureSchema,
  RecoverIdentityRequestSchema,
  type Space,
  SpaceSchema,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import {
  type Credential,
  CredentialSchema,
  type DeviceProfileDocument,
  DeviceProfileDocumentSchema,
  type Presentation,
  PresentationSchema,
  type ProfileDocument,
  ProfileDocumentSchema,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import {
  type Contact as LegacyContact,
  type Device as LegacyDevice,
  type Identity as LegacyIdentity,
  type Space as LegacySpace,
} from '@dxos/protocols/proto/dxos/client/services';
import {
  type Credential as LegacyCredential,
  type DeviceProfileDocument as LegacyDeviceProfileDocument,
  type Presentation as LegacyPresentation,
  type ProfileDocument as LegacyProfileDocument,
} from '@dxos/protocols/proto/dxos/halo/credentials';

//
// The client services speak buf while this package's public API still exposes the protobuf.js
// shapes — notably `Credential.subject.assertion`, which callers index by '@type' and buf carries
// as a typeUrl. The proxies convert here, at the one boundary, via the shared wire bytes.
//

/** Reads an identity from the services as the shape the public API exposes. */
export const fromBufIdentity = (identity: Identity): LegacyIdentity =>
  decodeCompat(IdentitySchema, buf.toBinary(IdentitySchema, identity));

/** Reads a contact from the services as the shape the public API exposes. */
export const fromBufContact = (contact: Contact): LegacyContact =>
  decodeCompat(ContactSchema, buf.toBinary(ContactSchema, contact));

/** Reads a device from the services as the shape the public API exposes. */
export const fromBufDevice = (device: Device): LegacyDevice =>
  decodeCompat(DeviceSchema, buf.toBinary(DeviceSchema, device));

/** Reads a credential from the services as the shape the public API exposes. */
export const fromBufCredential = (credential: Credential): LegacyCredential =>
  decodeCompat(CredentialSchema, buf.toBinary(CredentialSchema, credential));

/** Reads a presentation from the services as the shape the public API exposes. */
export const fromBufPresentation = (presentation: Presentation): LegacyPresentation =>
  decodeCompat(PresentationSchema, buf.toBinary(PresentationSchema, presentation));

/** Reads a space from the services as the shape the public API exposes. */
export const fromBufSpace = (space: Space): LegacySpace => decodeCompat(SpaceSchema, buf.toBinary(SpaceSchema, space));

/** Writes a credential from the public API as the buf message the services take. */
export const toBufCredential = (credential: LegacyCredential): Credential =>
  buf.fromBinary(CredentialSchema, encodeCompat(CredentialSchema, credential));

/** Writes a profile from the public API as the buf message the services take. */
export const toBufProfileDocument = (profile: LegacyProfileDocument): ProfileDocument =>
  buf.fromBinary(ProfileDocumentSchema, encodeCompat(ProfileDocumentSchema, profile));

/** Writes a device profile from the public API as the buf message the services take. */
export const toBufDeviceProfileDocument = (profile: LegacyDeviceProfileDocument): DeviceProfileDocument =>
  buf.fromBinary(DeviceProfileDocumentSchema, encodeCompat(DeviceProfileDocumentSchema, profile));

/** Writes the public API's recovery argument union as the buf oneof the service takes. */
export const toBufRecoverIdentityRequest = (args: RecoverIdentityArgs): RecoverIdentityRequest =>
  buf.create(RecoverIdentityRequestSchema, {
    request:
      'recoveryCode' in args
        ? { case: 'recoveryCode', value: args.recoveryCode }
        : 'recoveryProof' in args
          ? { case: 'recoveryProof', value: args.recoveryProof }
          : 'token' in args
            ? { case: 'token', value: args.token }
            : {
                case: 'external',
                value: buf.fromBinary(
                  RecoverIdentityRequest_ExternalSignatureSchema,
                  encodeCompat(RecoverIdentityRequest_ExternalSignatureSchema, args.external),
                ),
              },
  });

/** Writes a contact from the public API as the buf message the services take. */
export const toBufContact = (contact: LegacyContact): Contact =>
  buf.fromBinary(ContactSchema, encodeCompat(ContactSchema, contact));
