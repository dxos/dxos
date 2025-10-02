//
// Copyright 2025 DXOS.org
//

import { type PostHogConfig } from 'posthog-js';

import { type Config } from '@dxos/config';
import { todo } from '@dxos/debug';

import { type Extension } from '../observability-extension';

export type ExtensionsOptions = { config: Config; posthog?: Partial<PostHogConfig> };

export const extensions = async ({ config, posthog: posthogConfig }: ExtensionsOptions): Promise<Extension> => {
  const { default: posthog } = await import('posthog-js');
  const apiKey = config.get('runtime.app.env.DX_POSTHOG_API_KEY');
  const api_host = config.get('runtime.app.env.DX_POSTHOG_API_HOST');

  return {
    initialize: () => {
      // https://posthog.com/docs/libraries/js/config
      posthog.init(apiKey, {
        api_host,
        mask_all_text: true,
        ...posthogConfig,
      });
    },
    enable: () => {
      posthog.opt_in_capturing();
    },
    disable: () => {
      posthog.opt_out_capturing();
    },
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
};
