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
 * space. Whether it runs is up to its plugin's {@link SettingsAnnotation} entry (see {@link resolve}).
 */
export type Definition = {
  /** Stable id the trace names the hook by, e.g. `org.dxos.hook.planning.planReminder`. */
  key: string;

  /** Id of the plugin that contributes the hook; settings turn hooks on and off by plugin. */
  plugin: string;

  /**
   * When the hook fires. `end-request` is after the model has driven a request to completion: the
   * series of agent/tool turns a prompt starts.
   */
  event: 'end-request';

  /** Key of a skill that must be bound to the conversation for the hook to fire; absent ⇒ every conversation. */
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

/** A hook as a plugin declares it; the plugin adds its id when it contributes the hook ({@link forPlugin}). */
export type Declaration = Omit<Definition, 'plugin'>;

/** `hooks` as `plugin` contributes them. */
export const forPlugin = (plugin: string, hooks: readonly Declaration[]): Definition[] =>
  hooks.map((hook) => ({ ...hook, plugin }));

/** Plugin ids whose hooks are turned on (`true`) or off (`false`); a plugin not listed has its default. */
export type Settings = Readonly<Record<string, boolean>>;

/**
 * Which plugins' hooks run, on a space's properties (for every agent in the space, wherever it runs) and on an
 * agent's instructions (for runs with those instructions, overriding the space plugin by plugin).
 */
export const SettingsAnnotation = Annotation.make({
  id: 'org.dxos.annotation.hooks',
  schema: Schema.Record(Schema.String, Schema.Boolean),
});

/** Turns `plugin`'s hooks on or off in `target`'s settings (a space's properties or an agent's instructions). */
export const setEnabled = (target: Obj.Unknown, plugin: string, enabled: boolean): void => {
  Obj.update(target, (target) => {
    const settings = Annotation.get(target, SettingsAnnotation).pipe(Option.getOrElse(() => ({})));
    Annotation.set(target, SettingsAnnotation, { ...settings, [plugin]: enabled });
  });
};

/**
 * Whether `plugin`'s hooks run when no setting names it: only if every one of them is gated by a skill, so a
 * host that has every plugin (EDGE) runs nothing a conversation did not opt into by binding the skill.
 */
export const isOnByDefault = (catalog: readonly Definition[], plugin: string): boolean =>
  catalog.every((hook) => hook.plugin !== plugin || hook.skill !== undefined);

/** The hooks one request runs, and what the trace records about the rest. */
export type Resolution = {
  /** On, available on this host, and their skill condition holds. */
  run: Definition[];
  /** Keys of the hooks in `run` that are on by their plugin's default rather than a setting. */
  byDefault: string[];
  /** Keys of hooks a setting turns on whose skill is not bound. */
  inactive: string[];
  /** Plugins a setting turns on that contribute no hook on this host (e.g. not enabled here). */
  missing: string[];
};

/**
 * The hooks for `event` whose plugin `space` and `instructions` leave on, given the skills bound to the
 * conversation. Hooks run in catalog order.
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
  const settings: Settings = { ...space, ...instructions };
  const resolution: Resolution = {
    run: [],
    byDefault: [],
    inactive: [],
    missing: Object.keys(settings)
      .filter((plugin) => settings[plugin] && !catalog.some((hook) => hook.plugin === plugin))
      .sort(),
  };
  for (const hook of catalog) {
    const setting = settings[hook.plugin];
    if (hook.event !== event || !(setting ?? isOnByDefault(catalog, hook.plugin))) {
      continue;
    }
    if (hook.skill === undefined || skillKeys.has(hook.skill)) {
      resolution.run.push(hook);
      if (setting === undefined) {
        resolution.byDefault.push(hook.key);
      }
    } else if (setting !== undefined) {
      resolution.inactive.push(hook.key);
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
