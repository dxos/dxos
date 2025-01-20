//
// Copyright 2025 DXOS.org
//
//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';

import { DECK_PLUGIN } from '../../meta';
import { type DeckSettingsProps } from '../../types';

const isSocket = !!(globalThis as any).__args;

// TODO(mjamesderocher): Can we get this directly from Socket?
const appScheme = 'composer://';

// TODO(mjamesderocher): Factor out as part of NavigationPlugin.
const checkAppScheme = (url: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  iframe.src = url + window.location.pathname.replace(/^\/+/, '') + window.location.search;

  const timer = setTimeout(() => {
    document.body.removeChild(iframe);
  }, 3000);

  window.addEventListener('pagehide', (event) => {
    clearTimeout(timer);
    document.body.removeChild(iframe);
  });
};

export default async (context: PluginsContext) => {
  const settingsStore = context.requestCapability(Capabilities.SettingsStore);
  const settings = settingsStore.getStore<DeckSettingsProps>(DECK_PLUGIN)?.value;
  if (!isSocket && settings?.enableNativeRedirect) {
    checkAppScheme(appScheme);
  }

  return contributes(Capabilities.Null, null);
};
