//
// Copyright 2026 DXOS.org
//

import type * as Process from '@dxos/compute/Process';
import type * as Trace from '@dxos/compute/Trace';

/**
 * What a running process is working on behalf of, as a single bucket.
 *
 * Bucketed from the inherited {@link Process.Environment}, so filtering keeps whole subtrees together.
 */
// TODO(burdon): Factor out.
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

/**
 * Narrows trace messages to the selected processes and their descendants: a tool call or sub-agent
 * runs as a child of the process it serves, so its events are that process's work. An empty
 * selection is no filter.
 */
/**
 * Narrows the process tree to the selected processes and their descendants, the process-side twin of
 * {@link filterTraceMessages}: a running child of a picked process is that process's live work.
 */
export const filterProcessesBySelection = (
  processes: readonly Process.Info[],
  selected: readonly string[],
): readonly Process.Info[] => {
  if (selected.length === 0) {
    return processes;
  }
  const parentByPid = new Map<string, string | null>(processes.map((process) => [process.pid, process.parentPid]));
  const selection = new Set(selected);
  const isSelected = (pid: string, depth = 0): boolean => {
    if (selection.has(pid)) {
      return true;
    }
    const parent = parentByPid.get(pid);
    // Bounded so a cyclic parent chain (a corrupt tree) terminates.
    return parent !== null && parent !== undefined && depth < processes.length && isSelected(parent, depth + 1);
  };
  return processes.filter((process) => isSelected(process.pid));
};

export const filterTraceMessages = (
  messages: readonly Trace.Message[],
  selected: readonly string[],
): readonly Trace.Message[] => {
  if (selected.length === 0) {
    return messages;
  }
  const parentByPid = new Map<string, string | undefined>();
  for (const message of messages) {
    if (message.meta.pid !== undefined) {
      parentByPid.set(message.meta.pid, message.meta.parentPid);
    }
  }
  const selection = new Set(selected);
  const matches = new Map<string, boolean>();
  const isSelected = (pid: string): boolean => {
    const known = matches.get(pid);
    if (known !== undefined) {
      return known;
    }
    // Pinned before the walk so a cyclic parent chain (a corrupt trace) terminates.
    matches.set(pid, false);
    const parent = parentByPid.get(pid);
    const result = selection.has(pid) || (parent !== undefined && isSelected(parent));
    matches.set(pid, result);
    return result;
  };
  return messages.filter((message) => message.meta.pid !== undefined && isSelected(message.meta.pid));
};
