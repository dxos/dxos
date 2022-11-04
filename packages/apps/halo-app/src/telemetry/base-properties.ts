//
// Copyright 2022 DXOS.org
//

import { captureException } from '@dxos/sentry';

const IPDATA_API_KEY = process.env.IPDATA_API_KEY;

export const DX_ENVIRONMENT = process.env.DX_ENVIRONMENT;
export const DX_RELEASE = process.env.DX_RELEASE;

export const BASE_PROPERTIES: any = {
  environment: DX_ENVIRONMENT,
  release: DX_RELEASE,
  group: localStorage.getItem('__TELEMETRY_GROUP__')
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
