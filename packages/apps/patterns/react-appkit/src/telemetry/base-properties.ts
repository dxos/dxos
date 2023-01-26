//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { log } from '@dxos/log';
import { humanize } from '@dxos/util';

let DX_TELEMETRY: string | null = null;
let DX_GROUP: string | null = null;
try {
  // LocalStorage is not available in Chrome extensions sandboxed files.
  // https://developer.chrome.com/docs/extensions/mv3/manifest/sandbox/
  // And it will throw an error if we try to access it.
  DX_TELEMETRY = localStorage.getItem('halo-app:t elemetry-disabled');
  DX_GROUP = localStorage.getItem('halo-app:telemetry-group');
} catch (err) {
  log.catch(err);
}

export { DX_TELEMETRY, DX_GROUP };

export const BASE_TELEMETRY_PROPERTIES: any = {
  group: DX_GROUP
};

if (navigator.storage?.estimate) {
  setInterval(async () => {
    const storageEstimate = await navigator.storage.estimate();
    BASE_TELEMETRY_PROPERTIES.storageUsage = storageEstimate.usage;
    BASE_TELEMETRY_PROPERTIES.storageQuota = storageEstimate.quota;
  }, 10e3);
}

// TODO(wittjosiah): Store uuid in halo for the purposes of usage metrics.
// await client.halo.getGlobalPreference('dxosTelemetryIdentifier');
export const getTelemetryIdentifier = (client: Client) => {
  const profile = client.halo.profile;
  if (profile) {
    humanize(profile.identityKey);
  }

  return undefined;
};
