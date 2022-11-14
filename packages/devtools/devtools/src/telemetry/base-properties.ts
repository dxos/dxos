//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { captureException } from '@dxos/sentry';
import { humanize } from '@dxos/util';

const IPDATA_API_KEY = process.env.IPDATA_API_KEY;

export const DX_TELEMETRY = localStorage.getItem('halo-app:telemetry-disabled');
export const DX_GROUP = localStorage.getItem('halo-app:telemetry-group');
export const DX_ENVIRONMENT = process.env.DX_ENVIRONMENT;
export const DX_RELEASE = process.env.DX_RELEASE;

export const BASE_PROPERTIES: any = {
  environment: DX_ENVIRONMENT,
  release: DX_RELEASE,
  group: DX_GROUP
};

setInterval(async () => {
  const storageEstimate = await navigator.storage.estimate();
  BASE_PROPERTIES.storageUsage = storageEstimate.usage;
  BASE_PROPERTIES.storageQuota = storageEstimate.quota;
}, 10e3);

void fetch(`https://api.ipdata.co?api-key=${IPDATA_API_KEY}`)
  .then((res) => res.json())
  .then((data) => {
    BASE_PROPERTIES.city = data.city;
    BASE_PROPERTIES.region = data.region;
    BASE_PROPERTIES.country = data.country;
    BASE_PROPERTIES.latitude = data.latitude;
    BASE_PROPERTIES.longitude = data.longitude;
  })
  .catch((err) => captureException(err));

// TODO(wittjosiah): Store uuid in halo for the purposes of usage metrics.
// await client.halo.getGlobalPreference('dxosTelemetryIdentifier');
export const getIdentifier = (client: Client) => {
  const profile = client.halo.profile;
  if (profile) {
    humanize(profile.identityKey);
  }

  return undefined;
};
