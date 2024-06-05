//
// Copyright 2024 DXOS.org
//

import { type metrics } from '@sentry/browser';

import { isNode } from '@dxos/util';

/**
 * Allows metrics to be recorded within SDK code without requiring consumers to use Sentry.
 */
// TODO(wittjosiah): Sentry dependency should be factored out of this package.
//  Currently this will download the sentry package from npm even if it is not used.
//  Async import however allows it to be code-split and not downloaded to user devices if unused.
export class RemoteMetrics {
  private _metrics: typeof metrics | undefined;

  async initialize() {
    // NOTE: Depends on Sentry being setup elsewhere in the application.
    //  Currently @dxos/observability handles Sentry initialization.
    if (isNode()) {
      const { metrics } = await import('@sentry/node');
      this._metrics = metrics;
    } else {
      const { metrics } = await import('@sentry/browser');
      this._metrics = metrics;
    }
  }

  increment(...args: Parameters<(typeof metrics)['increment']>): ReturnType<(typeof metrics)['increment']> {
    return this._metrics?.increment(...args);
  }

  distribution(...args: Parameters<(typeof metrics)['distribution']>): ReturnType<(typeof metrics)['distribution']> {
    return this._metrics?.distribution(...args);
  }

  set(...args: Parameters<(typeof metrics)['set']>): ReturnType<(typeof metrics)['set']> {
    return this._metrics?.set(...args);
  }

  gauge(...args: Parameters<(typeof metrics)['gauge']>): ReturnType<(typeof metrics)['gauge']> {
    return this._metrics?.gauge(...args);
  }
}
