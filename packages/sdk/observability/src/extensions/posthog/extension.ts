//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type PostHogConfig } from 'posthog-js';

import { type Config } from '@dxos/config';
import { log } from '@dxos/log';

import { LogBuffer } from '../../log-buffer';
import { type Extension } from '../../observability-extension';
import { stubExtension } from '../stub';

export type ExtensionsOptions = {
  config: Config;
  /** Release identifier, e.g. `composer@0.8.3`. */
  release?: string;
  /** Deployment environment, e.g. `production` or `staging`. */
  environment?: string;
  posthog?: Partial<PostHogConfig>;
};

/** Upload serialized logs to the feedback-logs endpoint. Returns the R2 key on success. */
const uploadLogs = async (body: string): Promise<string | undefined> => {
  try {
    const response = await fetch('/api/feedback-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-ndjson' },
      body,
    });
    if (!response.ok) {
      log.warn('feedback log upload failed', { status: response.status });
      return undefined;
    }
    const { key } = await response.json();
    return key;
  } catch (err) {
    log.warn('feedback log upload error', { error: err });
    return undefined;
  }
};

/** Create a PostHog-backed observability extension for events, errors, and feedback. */
export const extensions: (options: ExtensionsOptions) => Effect.Effect<Extension> = Effect.fn(function* ({
  config,
  release,
  environment,
  posthog: posthogConfig,
}) {
  if (typeof window === 'undefined') {
    log('PostHog is being stubbed because it is running in a worker.');
    return stubExtension;
  }

  const feedbackSurveyId = config.get('runtime.app.env.DX_POSTHOG_FEEDBACK_SURVEY_ID');
  const apiKey = config.get('runtime.app.env.DX_POSTHOG_API_KEY');
  const api_host = config.get('runtime.app.env.DX_POSTHOG_API_HOST');
  if (!apiKey || !api_host) {
    log.info('Missing POSTHOG_API_KEY or POSTHOG_API_HOST');
    return stubExtension;
  }

  const { default: posthog } = yield* Effect.promise(() => import('posthog-js'));
  const { logProcessor } = yield* Effect.promise(() => import('./log-processor'));
  const logBuffer = new LogBuffer();
  let feedbackSurveyAvailable: boolean | null = null;

  const checkFeedbackSurveyAvailable = (): Effect.Effect<boolean> =>
    feedbackSurveyId
      ? Effect.promise(() => {
          if (feedbackSurveyAvailable !== null) {
            return Promise.resolve(feedbackSurveyAvailable);
          }
          return new Promise<boolean>((resolve) => {
            posthog.getSurveys((surveys) => {
              const found = surveys.some((s) => s.id === feedbackSurveyId);
              feedbackSurveyAvailable = found;
              resolve(found);
            });
          });
        })
      : Effect.succeed(false);

  return {
    initialize: () =>
      Effect.sync(() => {
        // https://posthog.com/docs/libraries/js/config
        posthog.init(apiKey, {
          api_host,
          mask_all_text: true,
          capture_exceptions: true,
          ...posthogConfig,
        });
        if (release || environment) {
          posthog.register({
            ...(release ? { release } : {}),
            ...(environment ? { environment } : {}),
          });
        }
        log.runtimeConfig.processors.push(logProcessor);
        log.runtimeConfig.processors.push(logBuffer.logProcessor);
      }),
    close: () =>
      Effect.sync(() => {
        for (const processor of [logProcessor, logBuffer.logProcessor]) {
          const index = log.runtimeConfig.processors.indexOf(processor);
          if (index !== -1) {
            log.runtimeConfig.processors.splice(index, 1);
          }
        }
      }),
    enable: () => Effect.sync(() => posthog.opt_in_capturing()),
    disable: () => Effect.sync(() => posthog.opt_out_capturing()),
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
        isAvailable: () => Effect.succeed(true),
        captureEvent: (event, attributes) => {
          posthog.capture(event, attributes);
        },
      },
      {
        kind: 'errors',
        isAvailable: () => Effect.succeed(true),
        captureException: (error, attributes) => {
          posthog.captureException(error, attributes);
        },
      },
      {
        kind: 'feedback',
        // TODO(wittjosiah): Support custom surveys.
        captureUserFeedback: (form) => {
          posthog.getSurveys(async (surveys) => {
            const survey = surveys.find((survey) => survey.id === feedbackSurveyId);
            if (!survey || survey.questions.length === 0) {
              log.error('Missing feedback survey or survey has no questions', { feedbackSurveyId });
              return;
            }

            let debugLogDumpKey: string | undefined;
            if (form.includeLogs !== false && logBuffer.size > 0) {
              debugLogDumpKey = await uploadLogs(logBuffer.serialize());
            }

            // https://posthog.com/docs/surveys/implementing-custom-surveys
            const question = survey.questions[0];
            posthog.capture('survey sent', {
              $survey_id: survey.id,
              $survey_questions: [{ id: question.id, question: question.question }],
              [`$survey_response_${question.id}`]: form.message,
              ...(debugLogDumpKey ? { debug_log_dump_key: debugLogDumpKey } : {}),
            });
          });
        },
        isAvailable: checkFeedbackSurveyAvailable,
      },
    ],
  };
});
