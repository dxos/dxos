//
// Copyright 2026 DXOS.org
//

import type * as Process from '@dxos/compute/Process';

/**
 * What a running process is working on behalf of, as a single bucket.
 *
 * Bucketed from the inherited {@link Process.Environment}, so filtering keeps whole subtrees together.
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

/** App-level processes start hidden: that bucket fires on every click, whatever the user is watching. */
export const DEFAULT_PROCESS_ENVIRONMENTS: readonly ProcessEnvironment[] = [
  ProcessEnvironment.Space,
  ProcessEnvironment.Conversation,
];

const ENVIRONMENT_ICONS: Record<ProcessEnvironment, string> = {
  [ProcessEnvironment.App]: 'ph--app-window--regular',
  [ProcessEnvironment.Space]: 'ph--planet--regular',
  [ProcessEnvironment.Conversation]: 'ph--chat-teardrop-text--regular',
};

export const environmentIcon = (environment: ProcessEnvironment): string => ENVIRONMENT_ICONS[environment];

/** `conversation` outranks `space`, since a conversation always runs inside one. */
export const processEnvironment = (process: Process.Info): ProcessEnvironment => {
  if (process.environment.conversation !== undefined) {
    return ProcessEnvironment.Conversation;
  }
  if (process.environment.space !== undefined) {
    return ProcessEnvironment.Space;
  }
  return ProcessEnvironment.App;
};

export const filterProcesses = (
  processes: readonly Process.Info[],
  selected: readonly ProcessEnvironment[],
): readonly Process.Info[] => {
  // Identity when nothing is excluded, so `ProcessTree`'s `React.memo` still holds.
  if (selected.length === ALL_PROCESS_ENVIRONMENTS.length) {
    return processes;
  }
  const selection = new Set(selected);
  return processes.filter((process) => selection.has(processEnvironment(process)));
};

/** Toggles an environment, preserving the canonical order. */
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
 * Settings outlive the vocabulary that wrote them; an unrecognized value would filter the panel to nothing.
 */
export const parseProcessEnvironments = (selected: readonly string[] | undefined): readonly ProcessEnvironment[] =>
  selected === undefined
    ? DEFAULT_PROCESS_ENVIRONMENTS
    : ALL_PROCESS_ENVIRONMENTS.filter((environment) => selected.includes(environment));
