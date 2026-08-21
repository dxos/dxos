//
// Copyright 2025 DXOS.org
//

import { Doc, FormBuilder } from '@dxos/cli-util';

/**
 * A plugin as `dx plugin list` reports it.
 *
 * `installed` and `enabled` are independent: a plugin can be present without contributing
 * anything (installed, disabled), which is what keeps a plugin's commands, its MCP tools and
 * its share of per-command startup cost off a `dx` invocation without discarding it. `core`
 * pins both on. `failure` is populated when the plugin was meant to be active this run but
 * could not load or activate — without it a plugin simply disappears from `dx --help` and
 * `dx mcp serve`'s tool list with nothing to explain the absence.
 */
export type FormattedPlugin = {
  id: string;
  name: string;
  installed: boolean;
  enabled: boolean;
  core: boolean;
  /** Where the plugin came from: compiled in, snapshotted from a URL, or read from a directory. */
  source: 'builtin' | 'url' | 'dev';
  version?: string;
  failure?: string;
};

/** One-word summary of the two axes, for the `status` line and for filtering. */
export const getPluginStatus = (plugin: FormattedPlugin): string => {
  if (plugin.failure) {
    return 'failed';
  }
  if (plugin.core) {
    return 'core';
  }
  return plugin.enabled ? 'enabled' : 'disabled';
};

/**
 * Pretty prints a plugin with ANSI colors.
 */
export const printPlugin = (plugin: FormattedPlugin): Doc.Doc<any> => {
  let builder = FormBuilder.make({ title: plugin.name }).pipe(
    FormBuilder.set('id', plugin.id),
    FormBuilder.set('status', getPluginStatus(plugin)),
    FormBuilder.set('source', plugin.source),
    FormBuilder.set('installed', String(plugin.installed)),
    FormBuilder.set('enabled', String(plugin.enabled)),
  );
  if (plugin.version) {
    builder = builder.pipe(FormBuilder.set('version', plugin.version));
  }
  if (plugin.failure) {
    builder = builder.pipe(FormBuilder.set('error', plugin.failure));
  }

  return builder.pipe(FormBuilder.build);
};
