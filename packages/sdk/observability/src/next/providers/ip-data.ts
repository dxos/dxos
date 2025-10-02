//
// Copyright 2025 DXOS.org
//

// NOTE: localStorage is not available in web workers.
import * as localForage from 'localforage';

import { type Config } from '@dxos/config';
import { log } from '@dxos/log';

import { type IPData as IPDataType } from '../../helpers';
import { type DataProvider } from '../observability';

const getIPData = async (config: Config): Promise<IPDataType | void> => {
  const IP_DATA_CACHE_TIMEOUT = 6 * 60 * 60 * 1000; // 6 hours
  type CachedIPData = {
    data: IPDataType;
    timestamp: number;
  };

  // Check cache first.
  const cachedData: null | CachedIPData = await localForage.getItem('dxos:observability:ipdata');
  if (cachedData && cachedData.timestamp > Date.now() - IP_DATA_CACHE_TIMEOUT) {
    return cachedData.data;
  }

  // Fetch data if not cached.
  const IPDATA_API_KEY = config.get('runtime.app.env.DX_IPDATA_API_KEY');
  if (IPDATA_API_KEY) {
    return fetch(`https://api.ipdata.co?api-key=${IPDATA_API_KEY}`)
      .then((res) => res.json())
      .then((data) => {
        // Cache data.
        localForage
          .setItem('dxos:observability:ipdata', {
            data,
            timestamp: Date.now(),
          })
          .catch((err) => log.catch(err));

        return data;
      })
      .catch((err) => log.catch(err));
  }
};

export const provider =
  (config: Config): DataProvider =>
  async (observability) => {
    const ipData = await getIPData(config);
    if (!ipData) {
      return;
    }

    observability.setTags({
      city: ipData.city,
      region: ipData.region,
      country: ipData.country,
      latitude: ipData.latitude,
      longitude: ipData.longitude,
    });
  };
