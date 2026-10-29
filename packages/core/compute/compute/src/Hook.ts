//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import type * as Operation from './Operation.ts';

/**
 * A lifecycle hook an agent host runs, contributed by a plugin beside its skills rather than declared on a
 * {@link Skill}, so a skill stays to the Agent Skills spec's fields. Static: a hook is code, never stored in a
 * space.
 */
export type Definition = {
  /**
   * When the hook fires. `end-request` is after the model has driven a request to completion: the
   * series of agent/tool turns a prompt starts.
   */
  event: 'end-request';

  /** Key of the skill that must be bound to the conversation for the hook to fire; absent ⇒ every agent. */
  skill?: string;

  /** Runs with the conversation in its environment; may return {@link Output}. */
  operation: Operation.Definition.Any;

  /** Passed as the operation's input. */
  input?: Record<string, unknown>;

  /**
   * Run in the background: the request settles without waiting for the hook, and the agent process
   * awaits it before it finishes. For work the user should not wait on, e.g. reviewing the turn that
   * just ended.
   */
  async?: boolean;
};

/**
 * What a hook returns. A `followUp` is queued to the agent as a synthetic prompt, so the request
 * continues instead of ending — e.g. a reminder that the plan still has open tasks.
 */
export const Output = Schema.Struct({
  followUp: Schema.optional(Schema.String),
});

export type Output = Schema.Schema.Type<typeof Output>;

/** Hooks for `event` whose skill, if any, is among `skillKeys`. */
export const forEvent = (
  hooks: readonly Definition[],
  event: Definition['event'],
  skillKeys: ReadonlySet<string>,
): Definition[] =>
  hooks.filter((hook) => hook.event === event && (hook.skill === undefined || skillKeys.has(hook.skill)));

/** The follow-up a hook's output asks for; anything else, including no output, asks for none. */
export const followUp = (output: unknown): string | undefined =>
  Schema.decodeUnknownOption(Output)(output).pipe(
    Option.flatMap(({ followUp }) => Option.fromNullishOr(followUp)),
    Option.filter((text) => text.length > 0),
    Option.getOrUndefined,
  );
