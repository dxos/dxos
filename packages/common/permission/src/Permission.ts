//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Command from './Command.ts';
import * as Policy from './Policy.ts';
import * as Subject from './Subject.ts';

/** The triple: what resource, what verb, under what constraints. */
export const Permission = Schema.Struct({
  subject: Subject.Subject,
  command: Command.Command,
  policy: Schema.optional(Policy.Policy),
}).pipe(Schema.annotate({ title: 'Permission' }));
export type Permission = Schema.Schema.Type<typeof Permission>;

export type MakeOptions = {
  subject: Subject.Subject | string;
  command: Command.Command | string;
  policy?: Policy.Policy;
};

export const make = ({ subject, command, policy }: MakeOptions): Permission =>
  Schema.decodeUnknownSync(Permission)({
    subject: Subject.isSubject(subject) ? subject : Subject.make(subject),
    command: Command.isCommand(command) ? command : Command.make(command),
    ...(policy && policy.length > 0 ? { policy } : {}),
  });

/** Whether `parent` covers `child` on subject and command; policies are conjoined elsewhere. */
export const covers = (parent: Permission, child: Pick<Permission, 'subject' | 'command'>): boolean =>
  Subject.covers(parent.subject, child.subject) && Command.covers(parent.command, child.command);

/**
 * What a plugin registers: the command plus what the UI shows for it. The command string is what
 * checks; the rest is metadata, so an unregistered command still checks.
 */
export const Definition = Schema.Struct({
  command: Command.Command,
  name: Schema.String,
  description: Schema.optional(Schema.String),
  icon: Schema.optional(Schema.String),
  consentable: Schema.optional(Schema.Boolean),
}).pipe(Schema.annotate({ title: 'PermissionDefinition' }));
export type Definition = Schema.Schema.Type<typeof Definition>;

export type DefineOptions = Omit<Definition, 'command'> & { command: Command.Command | string };

export const define = ({ command, ...rest }: DefineOptions): Definition =>
  Schema.decodeUnknownSync(Definition)({
    ...rest,
    command: Command.isCommand(command) ? command : Command.make(command),
  });

/**
 * The annotation key under which an operation's requirements travel in its meta, so a persisted or
 * remote operation carries them.
 */
export const REQUIRED_ANNOTATION = '@dxos/permission/required';
