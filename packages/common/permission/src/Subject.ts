//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { type SpaceId } from '@dxos/keys';

/** Every subject the issuer holds; UCAN's powerline, resolved against the issuer's grants at check time. */
export const ANY = '*';

/**
 * The resource a permission is about: a space (`echo://<spaceId>`), an object in a space
 * (`echo://<spaceId>/<objectId>`), or `*`.
 */
export const Subject = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^(\*|echo:\/\/[A-Z0-9]+(\/[A-Z0-9]+)?)$/)),
  Schema.brand('@dxos/permission/Subject'),
  Schema.annotate({ title: 'Subject', description: 'An echo URI naming a space or an object, or *.' }),
);
export type Subject = Schema.Schema.Type<typeof Subject>;

export const make = (value: string): Subject => Schema.decodeSync(Subject)(value);

export const isSubject = (value: unknown): value is Subject => Schema.is(Subject)(value);

export const any = (): Subject => make(ANY);

/** The whole space. */
export const space = (spaceId: SpaceId | string): Subject => make(`echo://${spaceId}`);

/** One object in a space. */
export const object = (spaceId: SpaceId | string, objectId: string): Subject => make(`echo://${spaceId}/${objectId}`);

/** An object or space given as its echo URI, as refs and `@uri` fields carry it. */
export const of = (uri: string): Subject => make(uri);

/** The space a subject lives in; undefined for `*`. */
export const spaceIdOf = (subject: Subject): string | undefined => {
  if (subject === ANY) {
    return undefined;
  }
  const rest = subject.slice('echo://'.length);
  const slash = rest.indexOf('/');
  return slash === -1 ? rest : rest.slice(0, slash);
};

export const isSpace = (subject: Subject): boolean => subject !== ANY && !subject.slice('echo://'.length).includes('/');

/**
 * Whether `parent` covers `child`: the same URI, `*`, or a space covering an object inside it.
 * An object never covers its space, and `*` as a child is covered only by `*`.
 */
export const covers = (parent: Subject, child: Subject): boolean => {
  if (parent === ANY) {
    return true;
  }
  if (child === ANY) {
    return false;
  }
  if (parent === child) {
    return true;
  }
  return isSpace(parent) && child.startsWith(`${parent}/`);
};
