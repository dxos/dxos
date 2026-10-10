//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/**
 * A command is a `/`-separated path naming a verb on a subject, such as `/space/write` or
 * `/email/send`. A shorter path covers every path beneath it and `/` covers everything, which is
 * the UCAN rule and what lets a grant for `/space` prove a requirement for `/space/read`.
 */
export const Command = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/)),
  Schema.brand('@dxos/permission/Command'),
  Schema.annotate({
    title: 'Command',
    description: 'A /-separated command path; a prefix covers its descendants.',
  }),
);
export type Command = Schema.Schema.Type<typeof Command>;

/** The root command, covering every other command. */
export const ROOT: Command = Schema.decodeSync(Command)('/');

/** Decodes a command path, failing on anything that is not a lowercase `/`-separated path. */
export const make = (path: string): Command => Schema.decodeSync(Command)(path);

/** Whether the value is a well-formed command path. */
export const isCommand = (value: unknown): value is Command => Schema.is(Command)(value);

/** The path segments of a command; the root has none. */
export const segments = (command: Command): readonly string[] => (command === '/' ? [] : command.slice(1).split('/'));

/**
 * Whether `parent` covers `child`: `parent` is the same path or an ancestor of it. `/` covers
 * everything; `/space` covers `/space/read` and not `/spaces`.
 */
export const covers = (parent: Command, child: Command): boolean => {
  if (parent === ROOT) {
    return true;
  }
  return child === parent || child.startsWith(`${parent}/`);
};

/** The nearest common ancestor of two commands, which is what attenuation narrows to. */
export const intersect = (left: Command, right: Command): Command | undefined => {
  if (covers(left, right)) {
    return right;
  }
  if (covers(right, left)) {
    return left;
  }
  return undefined;
};
