//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { type SpaceId } from '@dxos/keys';

const IDENTITY = /^did:halo:[A-Z0-9]+$/;
const SPACE = /^echo:\/\/[A-Z0-9]+$/;
const PROCESS = /^echo:\/\/[A-Z0-9]+\/[A-Z0-9]+$/;

/**
 * Who holds or issues a grant. Nothing new is invented: an identity is its HALO DID, a space is its
 * `echo://` URI, and a process is the `echo://` URI of the runtime's process record.
 */
export const Principal = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^(did:halo:[A-Z0-9]+|echo:\/\/[A-Z0-9]+(\/[A-Z0-9]+)?)$/)),
  Schema.brand('@dxos/permission/Principal'),
  Schema.annotate({ title: 'Principal', description: 'A HALO DID, a space URI, or a process record URI.' }),
);
export type Principal = Schema.Schema.Type<typeof Principal>;

export type Kind = 'identity' | 'space' | 'process';

/** Decodes a principal, failing on anything that is not a DID or an echo URI. */
export const make = (value: string): Principal => Schema.decodeSync(Principal)(value);

export const isPrincipal = (value: unknown): value is Principal => Schema.is(Principal)(value);

/** A user or an agent, by HALO DID. */
export const identity = (did: string): Principal => make(did);

/** Every member of a space. */
export const space = (spaceId: SpaceId | string): Principal => make(`echo://${spaceId}`);

/** A process, by the URI of its record. */
export const process = (uri: string): Principal => make(uri);

export const kind = (principal: Principal): Kind => {
  if (IDENTITY.test(principal)) {
    return 'identity';
  }
  if (SPACE.test(principal)) {
    return 'space';
  }
  if (PROCESS.test(principal)) {
    return 'process';
  }
  throw new TypeError(`Not a principal: ${principal}`);
};

/** The space a space principal names, or undefined for the other kinds. */
export const spaceIdOf = (principal: Principal): string | undefined =>
  kind(principal) === 'space' ? principal.slice('echo://'.length) : undefined;

export const equals = (left: Principal, right: Principal): boolean => left === right;
