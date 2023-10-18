//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { tags as globalTags } from '../tags';

export type InitOptions = {
  apiKey: string;
  host?: string;
};

// TODO(nf): move to observability instance
let datadogmetrics: any;

// TODO(nf): convert to class?
export const init = (options: InitOptions) => {
  datadogmetrics = require('datadog-metrics');
  datadogmetrics.init({
    apiKey: options.apiKey,
    host: options.host,
    onError: (err: any) => {
      log.info('Datadog error', { err });
    },
  });
};

export const gauge = (name: string, value: number, tags?: any) => {
  invariant(datadogmetrics, 'Datadog not initialized');
  const mergedTags = Object.entries({ ...globalTags, ...tags }).map(([key, value]) => `${key}:${value}`);
  datadogmetrics.gauge(name, value, mergedTags);
};

export const flush = () => {
  datadogmetrics.flush();
};
