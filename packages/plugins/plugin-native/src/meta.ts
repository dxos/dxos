//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

// TODO(wittjosiah): Rename plugin (package + id) from `native` to `app` to match the user-facing name.
export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.native'),
  name: 'App',
  author: 'DXOS',
  spec: 'PLUGIN.mdl',
  description: trim`
    Tauri-based native platform integration for DXOS Composer on macOS, Linux, and Windows.

    Provides Spotlight window integration that forwards spotlight:invoke Tauri events to
    Composer operations, letting the OS-level launcher open spaces and switch workspaces
    without the main window being focused first.

    Manages over-the-air application updates via the Tauri updater plugin, automatically
    checking for new releases in the background, streaming download progress, and surfacing
    a toast notification with a one-click Relaunch action when an update is ready.

    Spawns an Ollama sidecar process on localhost for local AI model inference, registering
    it as an AiModelResolver so Assistant features can resolve model requests without any
    external server dependency.
  `,
  icon: 'ph--app-window--regular',
  tags: ['system'],
};
