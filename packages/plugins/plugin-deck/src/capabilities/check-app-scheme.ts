//
// Copyright 2025 DXOS.org
//

import { Capability, Common } from '@dxos/app-framework';

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

export default Capability.makeModule((context) => {
  const settings = context.getCapability(Common.Capability.SettingsStore).getStore<DeckSettingsProps>(meta.id)?.value;
  if (!isSocket && settings?.enableNativeRedirect) {
    checkAppScheme(appScheme);
  }

  return Capability.contributes(Common.Capability.Null, null);
});
