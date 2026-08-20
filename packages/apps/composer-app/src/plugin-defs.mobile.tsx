//
// Copyright 2026 DXOS.org
//

import type * as Plugin from '@dxos/app-framework/Plugin';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as TranscriptionPlugin from '@dxos/plugin-transcription/TranscriptionPlugin';

import { type PluginConfig, getCorePlugins } from './plugin-defs.core';

export type { PluginConfig, State } from './plugin-defs.core';

/**
 * Mobile set: core infrastructure plus Assistant (chat), Markdown (chat content) and Transcription
 * (voice input). Selection is build-time — swapping this file in via `DX_PLUGIN_SET=mobile` — rather
 * than a runtime flag, so a plugin with no mobile surface never enters the bundle.
 */
export const getPlugins = (config: PluginConfig): Plugin.Plugin[] => [
  ...getCorePlugins(config),
  AssistantPlugin.make(),
  MarkdownPlugin.make(),
  TranscriptionPlugin.make(),
];

/**
 * Plugin keys enabled by default for new users of the mobile set. Listed rather than derived from
 * {@link getPlugins}: the registry stays available here, so bundled and enabled are not the same set.
 */
export const getDefaults = (_: PluginConfig): string[] => [
  AssistantPlugin.meta.profile.key,
  MarkdownPlugin.meta.profile.key,
  TranscriptionPlugin.meta.profile.key,
];
