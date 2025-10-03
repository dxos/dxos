//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';
import { type PostHogConfig } from 'posthog-js';

import { type Config } from '@dxos/config';
import { todo } from '@dxos/debug';

import { type Extension } from '../observability-extension';

export type ExtensionsOptions = { config: Config; posthog?: Partial<PostHogConfig> };

export const extensions: (options: ExtensionsOptions) => Effect.Effect<Extension> = Effect.fn(function* ({
  config,
  posthog: posthogConfig,
}) {
  const { default: posthog } = yield* Effect.promise(() => import('posthog-js'));
  const apiKey = config.get('runtime.app.env.DX_POSTHOG_API_KEY');
  const api_host = config.get('runtime.app.env.DX_POSTHOG_API_HOST');

  return {
    initialize: Effect.fn(function* () {
      // https://posthog.com/docs/libraries/js/config
      posthog.init(apiKey, {
        api_host,
        mask_all_text: true,
        ...posthogConfig,
      });
    }),
    enable: Effect.fn(function* () {
      posthog.opt_in_capturing();
    }),
    disable: Effect.fn(function* () {
      posthog.opt_out_capturing();
    }),
    identify: (distinctId, attributes, setOnceAttributes) => {
      posthog.identify(distinctId, attributes, setOnceAttributes);
    },
    alias: (distinctId, previousId) => {
      posthog.alias(distinctId, previousId);
    },
    setTags: (tags) => {
      posthog.register_for_session(tags);
    },
    get enabled(): boolean {
      return posthog.is_capturing();
    },
    apis: [
      {
        kind: 'events',
        captureEvent: (event, attributes) => {
          posthog.capture(event, attributes);
        },
      },
      // TODO(wittjosiah): Add log processor to capture errors from logger. See sentry-log-processor.
      {
        kind: 'errors',
        captureException: (error, attributes) => {
          posthog.captureException(error, attributes);
        },
      },
      {
        kind: 'feedback',
        captureUserFeedback: () => {
          todo();
        },
      },
    ],
  };
});
