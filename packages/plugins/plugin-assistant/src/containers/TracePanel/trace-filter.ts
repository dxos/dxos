//
// Copyright 2026 DXOS.org
//

import type * as Process from '@dxos/compute/Process';

/**
 * What a running process is working on behalf of, as a single bucket.
 *
 * Derived from {@link Process.Environment} — the scope the runtime fixes at spawn and hands down to
 * child processes — so a filter built on it keeps a whole subtree together instead of cutting one
 * mid-branch.
 */
export const ProcessEnvironment = {
  /** Not scoped to a space: layout, navigation, identity, settings, space lifecycle. */
  App: 'app',
  /** Scoped to a space, but not to a conversation within it. */
  Space: 'space',
  /** Serving a conversation: an agent's turn and every tool call it spawns. */
  Conversation: 'conversation',
} as const;

export type ProcessEnvironment = (typeof ProcessEnvironment)[keyof typeof ProcessEnvironment];

/** Every environment, in menu order — widening scope, so the filter reads the same on every trace. */
export const ALL_PROCESS_ENVIRONMENTS: readonly ProcessEnvironment[] = [
  ProcessEnvironment.App,
  ProcessEnvironment.Space,
  ProcessEnvironment.Conversation,
];

/**
 * The selection the panel starts from: work scoped to a space or a conversation.
 *
 * App-level processes start hidden — that bucket is where the interface chatter lands (layout,
 * navigation, settings), and it fires on every click regardless of what the user is watching.
 */
export const DEFAULT_PROCESS_ENVIRONMENTS: readonly ProcessEnvironment[] = [
  ProcessEnvironment.Space,
  ProcessEnvironment.Conversation,
];

/** Icon shown beside each environment in the filter menu. */
const ENVIRONMENT_ICONS: Record<ProcessEnvironment, string> = {
  [ProcessEnvironment.App]: 'ph--app-window--regular',
  [ProcessEnvironment.Space]: 'ph--planet--regular',
  [ProcessEnvironment.Conversation]: 'ph--chat-teardrop-text--regular',
};

export const environmentIcon = (environment: ProcessEnvironment): string => ENVIRONMENT_ICONS[environment];

/**
 * Buckets a process by its environment.
 *
 * `conversation` outranks `space`: a conversation always runs inside one, so a process carrying both
 * is agent work — reporting it as space work would leave the conversation bucket permanently empty.
 */
export const processEnvironment = (process: Process.Info): ProcessEnvironment => {
  if (process.environment.conversation !== undefined) {
    return ProcessEnvironment.Conversation;
  }
  if (process.environment.space !== undefined) {
    return ProcessEnvironment.Space;
  }
  return ProcessEnvironment.App;
};

/** Keeps the processes whose environment is currently selected. */
export const filterProcesses = (
  processes: readonly Process.Info[],
  selected: readonly ProcessEnvironment[],
): readonly Process.Info[] => {
  // Identity when nothing is excluded, so an unfiltered panel hands `ProcessTree` the same array it
  // got last render and its `React.memo` still holds.
  if (selected.length === ALL_PROCESS_ENVIRONMENTS.length) {
    return processes;
  }
  const selection = new Set(selected);
  return processes.filter((process) => selection.has(processEnvironment(process)));
};

/** Adds or removes an environment from the selection, preserving the canonical order. */
export const toggleProcessEnvironment = (
  selected: readonly ProcessEnvironment[],
  environment: ProcessEnvironment,
): ProcessEnvironment[] =>
  ALL_PROCESS_ENVIRONMENTS.filter((candidate) =>
    candidate === environment ? !selected.includes(environment) : selected.includes(candidate),
  );

/**
 * Narrows a persisted selection to the known environments, in canonical order.
 *
 * Settings hold a plain string array, which outlives the vocabulary that wrote it: a value dropped
 * from {@link ProcessEnvironment} would otherwise filter out every process and leave an empty panel
 * with no visible cause.
 */
export const parseProcessEnvironments = (selected: readonly string[] | undefined): readonly ProcessEnvironment[] =>
  selected === undefined
    ? DEFAULT_PROCESS_ENVIRONMENTS
    : ALL_PROCESS_ENVIRONMENTS.filter((environment) => selected.includes(environment));
