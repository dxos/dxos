//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { type SpaceId } from '@dxos/keys';

const IDENTITY = /^did:halo:[A-Z0-9]+$/;
const SPACE = /^echo:\/\/[A-Z0-9]+$/;

/**
 * Who holds or issues a grant: any URI. Two kinds carry meaning for the evaluator: an identity is
 * its HALO DID (key-backed, grants to it are signed) and a space is its `echo://` URI (held by
 * every member). Anything else, such as the URI a runtime gives a process, is accepted as an
 * opaque principal whose grants are attested by whoever issued them.
 */
const ECHO = /^echo:\/\/[A-Z0-9]+(\/[A-Za-z0-9-]+)*$/;

/** A URI, held to the platform's own syntax when it uses the `did:halo:` or `echo:` scheme. */
const isPrincipalUri = (value: string): boolean => {
  if (value.startsWith('did:halo:')) {
    return IDENTITY.test(value);
  }
  if (value.startsWith('echo:')) {
    return ECHO.test(value);
  }
  return /^[a-z][a-z0-9+.-]*:\S+$/i.test(value);
};

export const Principal = Schema.String.pipe(
  Schema.refine((value): value is string => isPrincipalUri(value)),
  Schema.brand('@dxos/permission/Principal'),
  Schema.annotate({ title: 'Principal', description: 'A URI: a HALO DID, a space URI, or any other principal URI.' }),
);
export type Principal = Schema.Schema.Type<typeof Principal>;

/** `identity` and `space` are interpreted by the evaluator; `other` is any URI it treats as opaque. */
export type Kind = 'identity' | 'space' | 'other';

/** Decodes a principal, failing on anything that is not a URI. */
export const make = (value: string): Principal => Schema.decodeSync(Principal)(value);

export const isPrincipal = (value: unknown): value is Principal => Schema.is(Principal)(value);

/** A user or an agent, by HALO DID. */
export const identity = (did: string): Principal => make(did);

/** Every member of a space. */
export const space = (spaceId: SpaceId | string): Principal => make(`echo://${spaceId}`);

/** A process, by whatever URI its runtime names it with. */
export const process = (uri: string): Principal => make(uri);

export const kind = (principal: Principal): Kind => {
  if (IDENTITY.test(principal)) {
    return 'identity';
  }
  if (SPACE.test(principal)) {
    return 'space';
  }
  return 'other';
};

/** The space a space principal names, or undefined for the other kinds. */
export const spaceIdOf = (principal: Principal): string | undefined =>
  kind(principal) === 'space' ? principal.slice('echo://'.length) : undefined;

export const equals = (left: Principal, right: Principal): boolean => left === right;
