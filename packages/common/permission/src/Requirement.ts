//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Command from './Command.ts';
import { SubjectResolutionError } from './errors.ts';
import * as Permission from './Permission.ts';
import * as Policy from './Policy.ts';
import * as Subject from './Subject.ts';

/** A selector into the arguments that names the subject, e.g. `.args.mailbox`. */
export const SubjectSelector = Schema.String.pipe(Schema.check(Schema.isPattern(/^\.args(\.[A-Za-z0-9_]+)+$/)));
export type SubjectSelector = Schema.Schema.Type<typeof SubjectSelector>;

/** What an operation, tool, plugin or RPC declares it needs. */
export const Requirement = Schema.Struct({
  command: Command.Command,
  subject: Schema.optional(Schema.Union([Subject.Subject, SubjectSelector])),
  policy: Schema.optional(Policy.Policy),
  consentable: Schema.optional(Schema.Boolean),
}).pipe(Schema.annotate({ title: 'Requirement' }));
export type Requirement = Schema.Schema.Type<typeof Requirement>;

export type MakeOptions = {
  subject?: Subject.Subject | SubjectSelector | string;
  policy?: Policy.Policy;
  consentable?: boolean;
};

/** The subject as a selector over the operation's input, by argument name. */
export const arg = (name: string): SubjectSelector => Schema.decodeSync(SubjectSelector)(`.args.${name}`);

/** Builds a requirement from a definition (or a bare command) and how to find the subject. */
export const make = (
  definition: Permission.Definition | Command.Command | string,
  { subject, policy, consentable }: MakeOptions = {},
): Requirement => {
  const fromDefinition = typeof definition === 'string' ? undefined : definition;
  const command = fromDefinition?.command ?? (definition as string);
  return Schema.decodeUnknownSync(Requirement)({
    command: Command.isCommand(command) ? command : Command.make(command),
    ...(subject !== undefined ? { subject } : {}),
    ...(policy && policy.length > 0 ? { policy } : {}),
    ...((consentable ?? fromDefinition?.consentable) ? { consentable: true } : {}),
  });
};

const uriOf = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record['@uri'] === 'string') {
      return record['@uri'];
    }
    if (typeof record['/'] === 'string') {
      return record['/'];
    }
  }
  return undefined;
};

/**
 * The subject a requirement is about for one invocation: a fixed URI, a selector read from the
 * arguments (a string, a `{ '/': uri }` ref envelope, or an object with `@uri`), or `*` when the
 * requirement names none.
 */
export const resolveSubject = (requirement: Requirement, args: unknown): Subject.Subject => {
  const { subject } = requirement;
  if (subject === undefined) {
    return Subject.any();
  }
  if (Subject.isSubject(subject)) {
    return subject;
  }
  const uri = uriOf(Policy.select({ args }, subject));
  if (uri === undefined || !Subject.isSubject(uri)) {
    throw new SubjectResolutionError({ context: { selector: subject, value: uri } });
  }
  return uri;
};
