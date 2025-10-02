//
// Copyright 2025 DXOS.org
//

import { Array, pipe } from 'effect';

import { type CleanupFn, SubscriptionList } from '@dxos/async';
import { type MaybePromise } from '@dxos/util';

import {
  type Attributes,
  type Errors,
  type Events,
  type Extension,
  type ExtensionApi,
  type Feedback,
  type Kind,
  type Metrics,
} from './observability-extension';

// TODO(wittjosiah): Figure out how to handle when telemetry is disabled.
//   In theory the setting should be both persisted and synchronized.
//   Initialize probably should still run for the cases where data is emitted manually (e.g., feedback).

/**
 * Provider of observability data.
 */
export type DataProvider = (observability: Observability) => MaybePromise<CleanupFn | void>;

/**
 * Extensible observability provider.
 */
export class Observability {
  private readonly _subscriptions = new SubscriptionList();

  constructor(
    private readonly _extensions: Extension[],
    private readonly _dataProviders: DataProvider[],
  ) {}

  async initialize(): Promise<void> {
    for (const extension of this._extensions) {
      await extension.initialize?.();
    }

    const cleanups = await Promise.all(this._dataProviders.map((provider) => provider(this)));
    this._subscriptions.add(...cleanups.filter((cleanup) => cleanup !== undefined));
  }

  async close(): Promise<void> {
    this._subscriptions.clear();
    for (const extension of this._extensions) {
      await extension.close?.();
    }
  }

  async enable(): Promise<void> {
    for (const extension of this._extensions) {
      await extension.enable?.();
    }
  }

  async disable(): Promise<void> {
    for (const extension of this._extensions) {
      await extension.disable?.();
    }
  }

  async flush(): Promise<void> {
    for (const extension of this._extensions) {
      await extension.flush?.();
    }
  }

  async addDataProvider(dataProvider: DataProvider): Promise<void> {
    this._dataProviders.push(dataProvider);
    const cleanup = await dataProvider(this);
    if (cleanup) {
      this._subscriptions.add(cleanup);
    }
  }

  identify(distinctId: string, attributes?: Attributes, setOnceAttributes?: Attributes): void {
    for (const extension of this._extensions) {
      extension.identify?.(distinctId, attributes, setOnceAttributes);
    }
  }

  alias(distinctId: string, previousId?: string): void {
    for (const extension of this._extensions) {
      extension.alias?.(distinctId, previousId);
    }
  }

  setTags(tags: Attributes, kind?: Kind): void {
    for (const extension of this._extensions) {
      if (kind && extension.apis.some((api) => api.kind !== kind)) {
        continue;
      }

      const processedTags = Object.fromEntries(
        Object.entries(tags)
          .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined)
          .map(([key, value]) => [key, value.toString()]),
      );
      extension.setTags?.(processedTags);
    }
  }

  get enabled(): boolean {
    return this._extensions.every((extension) => extension.enabled);
  }

  get errors(): Errors {
    return {
      captureException: (error, attributes) => {
        for (const extension of this._getExtensions('errors')) {
          extension.captureException(error, attributes);
        }
      },
    };
  }

  get events(): Events {
    return {
      captureEvent: (event, attributes) => {
        for (const extension of this._getExtensions('events')) {
          extension.captureEvent(event, attributes);
        }
      },
    };
  }

  get feedback(): Feedback {
    return {
      captureUserFeedback: (form) => {
        for (const extension of this._getExtensions('feedback')) {
          extension.captureUserFeedback(form);
        }
      },
    };
  }

  get metrics(): Metrics {
    return {
      gauge: (name, value, attributes) => {
        for (const extension of this._getExtensions('metrics')) {
          extension.gauge(name, value, attributes);
        }
      },
      increment: (name, value, attributes) => {
        for (const extension of this._getExtensions('metrics')) {
          extension.increment(name, value, attributes);
        }
      },
      distribution: (name, value, attributes) => {
        for (const extension of this._getExtensions('metrics')) {
          extension.distribution(name, value, attributes);
        }
      },
    };
  }

  private _getExtensions<T extends Kind>(kind: T): Extract<ExtensionApi, { kind: T }>[] {
    return pipe(
      this._extensions,
      Array.flatMap((extension) => extension.apis),
      Array.filter((api): api is Extract<ExtensionApi, { kind: T }> => api.kind === kind),
    );
  }
}

export const make = (extensions: Extension[], dataProviders: DataProvider[] = []): Observability => {
  return new Observability(extensions, dataProviders);
};
