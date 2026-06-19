//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Button, Toast, useTranslation } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';

import { AiUsageQuotaError, parseError } from '../../processor';

type FailureToastProps = {
  /**
   * Raw failure exactly as it reaches {@link parseError}. The agent runs in a separate process and its
   * failure cause is rendered to a string before it returns, so production typically surfaces a string
   * here (not a typed error); the scenarios below mirror that.
   */
  rawError: unknown;
};

/**
 * Renders the failure toast that `Chat.Thread` shows when a request fails: the title comes from the
 * `ai-service-error.label` translation and the description is the message produced by {@link parseError}.
 * Driving the real {@link parseError} keeps the displayed text identical to production for each failure
 * class. The toast is held open (controlled) so it can be reviewed; production auto-dismisses after 20s.
 */
const FailureToast = ({ rawError }: FailureToastProps) => {
  const { t } = useTranslation(pluginMeta.profile.key);
  const [open, setOpen] = useState(true);
  const error = parseError(rawError);
  const action = error instanceof AiUsageQuotaError ? error.action : undefined;

  return (
    <Toast.Provider>
      <Toast.Viewport />
      {/* Long, 32-bit-safe duration keeps the toast up for review; larger values overflow setTimeout and fire immediately. */}
      <Toast.Root type='foreground' open={open} duration={24 * 60 * 60 * 1000} onOpenChange={setOpen}>
        <Toast.Title icon='ph--warning--regular' onClose={() => setOpen(false)}>
          {t('ai-service-error.label')}
        </Toast.Title>
        <Toast.Description>{error.message}</Toast.Description>
        {action && (
          <Toast.Actions>
            <Toast.Action altText={t(action.labelKey)} asChild>
              <Button onClick={() => setOpen(false)}>{t(action.labelKey)}</Button>
            </Toast.Action>
          </Toast.Actions>
        )}
      </Toast.Root>
    </Toast.Provider>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/components/Chat',
  render: FailureToast,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations },
} satisfies Meta<typeof FailureToast>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The over-quota (HTTP 429) failure — the case this story exists for. EDGE rejects the request and
 * `@effect/ai` surfaces an `HttpResponseError` whose message embeds the 429 status; the agent process
 * stringifies it before it reaches the chat. Previously this fell through to "An unexpected error
 * occurred."; it is now mapped to the actionable usage-limit message.
 */
export const QuotaExceeded: Story = {
  args: {
    rawError:
      'HttpResponseError: StatusCode: An HTTP response error occurred. (429 POST https://edge.dxos.workers.dev/ai/v1/messages)\nResponse Body: {"error":{"message":"You have exceeded your usage quota."}}',
  },
};

/** A configured model that the service does not recognize — the model name is surfaced to the user. */
export const ModelUnavailable: Story = {
  args: {
    rawError: "UnknownError: ChatCompletionsClient.streamText: model 'gemma3:27b' not found",
  },
};

/** Any unrecognized failure falls back to a generic message rather than leaking implementation detail. */
export const UnexpectedError: Story = {
  args: {
    rawError: 'something unexpected blew up',
  },
};
