//
// Copyright 2025 DXOS.org
//

import { Capabilities, type PluginContext, contributes, defineCapabilityModule } from '@dxos/app-framework';

import { meta } from '../meta';
import { type DeckSettingsProps } from '../types';

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

export default defineCapabilityModule(async (context: PluginContext) => {
  const settings = context.getCapability(Capabilities.SettingsStore).getStore<DeckSettingsProps>(meta.id)?.value;
  if (!isSocket && settings?.enableNativeRedirect) {
    checkAppScheme(appScheme);
  }

  return contributes(Capabilities.Null, null);
});
