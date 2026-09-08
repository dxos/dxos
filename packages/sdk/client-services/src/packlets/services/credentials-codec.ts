//
// Copyright 2026 DXOS.org
//

import { buf } from '@dxos/protocols/buf';
import { decodeCompat, encodeCompat } from '@dxos/protocols/buf-shape-compat';
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
  type Credential as LegacyCredential,
  type DeviceProfileDocument as LegacyDeviceProfileDocument,
  type Presentation as LegacyPresentation,
  type ProfileDocument as LegacyProfileDocument,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';

//
// The client services speak buf while `@dxos/credentials` keeps the protobuf.js shapes — the
// credential is signed over its protobuf.js encoding, so converting it there would change what is
// verified. These bridges carry the payloads across as their shared wire bytes instead, which
// leaves the credential subsystem untouched.
//

/** Reads a profile from `@dxos/credentials` as the buf message the services carry. */
export const toBufProfileDocument = (profile: LegacyProfileDocument | undefined): ProfileDocument | undefined =>
  profile && buf.fromBinary(ProfileDocumentSchema, encodeCompat(ProfileDocumentSchema, profile));

/** Writes a buf profile back as the shape `@dxos/credentials` expects. */
export const fromBufProfileDocument = (profile: ProfileDocument): LegacyProfileDocument =>
  decodeCompat(ProfileDocumentSchema, buf.toBinary(ProfileDocumentSchema, profile));

/** Reads a credential from `@dxos/credentials` as the buf message the services carry. */
export const toBufCredential = (credential: LegacyCredential): Credential =>
  buf.fromBinary(CredentialSchema, encodeCompat(CredentialSchema, credential));

/** Writes a buf credential back as the shape `@dxos/credentials` expects. */
export const fromBufCredential = (credential: Credential): LegacyCredential =>
  decodeCompat(CredentialSchema, buf.toBinary(CredentialSchema, credential));

/** Reads a device profile from `@dxos/credentials` as the buf message the services carry. */
export const toBufDeviceProfileDocument = (
  profile: LegacyDeviceProfileDocument | undefined,
): DeviceProfileDocument | undefined =>
  profile && buf.fromBinary(DeviceProfileDocumentSchema, encodeCompat(DeviceProfileDocumentSchema, profile));

/** Writes a buf device profile back as the shape `@dxos/credentials` expects. */
export const fromBufDeviceProfileDocument = (profile: DeviceProfileDocument): LegacyDeviceProfileDocument =>
  decodeCompat(DeviceProfileDocumentSchema, buf.toBinary(DeviceProfileDocumentSchema, profile));

/** Reads a presentation as the shape `signPresentation` expects. */
export const fromBufPresentation = (presentation: Presentation): LegacyPresentation =>
  decodeCompat(PresentationSchema, buf.toBinary(PresentationSchema, presentation));

/** Reads a signed presentation as the buf message the services return. */
export const toBufPresentation = (presentation: LegacyPresentation): Presentation =>
  buf.fromBinary(PresentationSchema, encodeCompat(PresentationSchema, presentation));
