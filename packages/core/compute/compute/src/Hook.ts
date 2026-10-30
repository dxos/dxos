//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Annotation, Obj } from '@dxos/echo';

import type * as Operation from './Operation.ts';

/**
 * A lifecycle hook an agent host can run, contributed by a plugin beside its skills rather than declared on a
 * {@link Skill}, so a skill stays to the Agent Skills spec's fields. Static: a hook is code, never stored in a
 * space. A contributed hook runs only where {@link SettingsAnnotation} turns its key on.
 */
export type Definition = {
  /** Stable id that settings name the hook by, e.g. `org.dxos.hook.planning.planReminder`. */
  key: string;

  /**
   * When the hook fires. `end-request` is after the model has driven a request to completion: the
   * series of agent/tool turns a prompt starts.
   */
  event: 'end-request';

  /** Key of a skill that must be bound to the conversation for an enabled hook to fire; absent ⇒ any conversation. */
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

/** Hook keys turned on (`true`) or off (`false`); a key not listed is off. */
export type Settings = Readonly<Record<string, boolean>>;

/**
 * Which hooks run, on a space's properties (for every agent in the space, wherever it runs) and on an
 * agent's instructions (for runs with those instructions, overriding the space key by key).
 */
export const SettingsAnnotation = Annotation.make({
  id: 'org.dxos.annotation.hooks',
  schema: Schema.Record(Schema.String, Schema.Boolean),
});

/** Turns `hooks` on in `target`'s settings (a space's properties or an agent's instructions), keeping its other keys. */
export const enable = (target: Obj.Unknown, hooks: readonly Definition[]): void => {
  Obj.update(target, (target) => {
    const settings = Annotation.get(target, SettingsAnnotation).pipe(Option.getOrElse(() => ({})));
    Annotation.set(target, SettingsAnnotation, {
      ...settings,
      ...Object.fromEntries(hooks.map((hook) => [hook.key, true])),
    });
  });
};

/** The hooks enabled for one request, as the trace records them. */
export type Resolution = {
  /** Enabled, available on this host, and their skill condition holds. */
  run: Definition[];
  /** Enabled and available, but their skill is not bound. */
  inactive: string[];
  /** Enabled, but this host has no hook with the key (e.g. its plugin is not enabled here). */
  missing: string[];
};

/**
 * The hooks for `event` that `space` and `instructions` turn on, sorted by what this host can do with each.
 * Hooks run in catalog order.
 */
export const resolve = ({
  catalog,
  event,
  space = {},
  instructions = {},
  skillKeys,
}: {
  catalog: readonly Definition[];
  event: Definition['event'];
  space?: Settings;
  instructions?: Settings;
  skillKeys: ReadonlySet<string>;
}): Resolution => {
  const settings = { ...space, ...instructions };
  const enabled = new Set(Object.keys(settings).filter((key) => settings[key]));
  const resolution: Resolution = {
    run: [],
    inactive: [],
    missing: [...enabled].filter((key) => !catalog.some((hook) => hook.key === key)).sort(),
  };
  for (const hook of catalog) {
    if (enabled.has(hook.key) && hook.event === event) {
      if (hook.skill === undefined || skillKeys.has(hook.skill)) {
        resolution.run.push(hook);
      } else {
        resolution.inactive.push(hook.key);
      }
    }
  }
  return resolution;
};

/** The follow-up a hook's output asks for; anything else, including no output, asks for none. */
export const followUp = (output: unknown): string | undefined =>
  Schema.decodeUnknownOption(Output)(output).pipe(
    Option.flatMap(({ followUp }) => Option.fromNullishOr(followUp)),
    Option.filter((text) => text.length > 0),
    Option.getOrUndefined,
  );
