//
// Copyright 2023 DXOS.org
//

import * as Datadog from 'datadog-metrics';
import debug from 'debug';

import { type Config } from '@dxos/client';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { defaultOptions } from './node';
// import { tags as globalTags } from '../tags';

export type DatadogOptions = {
  apiKey: string;
  host?: string;
  site?: String;
  getTags: () => Map<string, string>;
  // needed to read CORS proxy
  config: Config;
};

debug.enable('metrics');

export class DatadogMetrics {
  private _datadogmetrics?: any;
  private _getTags: () => Map<string, string>;

  constructor(options: DatadogOptions) {
    this._getTags = options.getTags;
    this._datadogmetrics = Datadog;

    this._datadogmetrics.init(defaultOptions(options));
  }

  gauge(name: string, value: number, tags?: any) {
    invariant(this._datadogmetrics, 'Datadog not initialized');
    const mergedTags = Object.entries({ ...Object.fromEntries(this._getTags().entries()), ...tags }).map(
      ([key, value]) => `${key}:${value}`,
    );
    log('datadog gauge', { name, value, tags: mergedTags });
    this._datadogmetrics.gauge(name, value, mergedTags);
  }

  flush() {
    this._datadogmetrics.flush();
  }
}
