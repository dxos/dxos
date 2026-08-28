//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { EdgeServiceName, getEnvString } from '@dxos/config';
import { useConfig, useEdgeServiceEndpoint } from '@dxos/react-client';
import { osTranslations } from '@dxos/ui-theme';

import { FeedbackForm, type FeedbackSubmitHandler } from '#components';
import { useDiscordPresence } from '#hooks';
import { meta } from '#meta';
import { SupportOperation } from '#types';

import { formatRequestMessage } from './request';
import { useScreenshotAttachment } from './useScreenshotAttachment';

/** Build a direct PostHog event permalink (±15s search window via timestamp). */
const makePostHogEventUrl = (projectId: string, eventUuid: string): string =>
  `https://eu.posthog.com/project/${projectId}/events/${eventUuid}/${encodeURIComponent(new Date().toISOString())}`;

export type DiscordActionProps = {
  disabled?: boolean;
};

/**
 * Submits the support request to PostHog (primary path) and then asks the discord-presence Edge
 * service to spin up a help thread (best-effort). On any Discord error, falls back to the plain
 * PostHog success toast so the user still gets feedback. Also renders the live presence hint.
 */
export const DiscordAction = ({ disabled }: DiscordActionProps) => {
  const { invokePromise } = useOperationInvoker();
  const config = useConfig();

  const posthogProjectId = getEnvString(config, 'DX_POSTHOG_PROJECT_ID');
  const discordEndpoint = useEdgeServiceEndpoint(EdgeServiceName.Discord);
  const discordServiceUrl = getEnvString(config, 'DX_DISCORD_SERVICE_URL') ?? discordEndpoint;

  const discordPresence = useDiscordPresence(discordServiceUrl);
  const attachScreenshot = useScreenshotAttachment();

  const handleDiscord = useCallback<FeedbackSubmitHandler>(
    async (values) => {
      // Capture before submitting, while the reported screen is still on-screen.
      const screenshot = await attachScreenshot(values);
      const message = formatRequestMessage(values, screenshot.url);

      // PostHog submission is the primary path — if it fails the error propagates
      // and no misleading toast is shown.
      const { data: eventUuid } = await invokePromise(SupportOperation.CaptureUserFeedback, {
        message,
        includeLogs: values.includeLogs,
      });

      // Open a blank popup synchronously while user activation is still valid.
      // Navigating it after the async work avoids popup-blocker policies.
      const popup = window.open('', '_blank');

      // Discord thread creation is best-effort; fall back to the PostHog toast on any error.
      try {
        const postHogEventUrl =
          posthogProjectId && eventUuid ? makePostHogEventUrl(posthogProjectId, eventUuid) : undefined;
        const res = await fetch(`${discordServiceUrl}/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, postHogEventUrl }),
        });
        if (!res.ok) {
          throw new Error(`Discord service returned ${res.status}`);
        }

        const { threadUrl } = (await res.json()) as { threadUrl?: string };
        if (!threadUrl) {
          throw new Error('Discord service did not return a thread URL');
        }
        // The pre-opened popup is our only way to navigate after the await; if it was blocked,
        // fall through to the PostHog success toast rather than claiming a Discord thread opened.
        if (!popup) {
          throw new Error('popup blocked');
        }
        popup.location.href = threadUrl;

        await invokePromise(LayoutOperation.UpdateComplementary, { state: 'collapsed' });
        await invokePromise(LayoutOperation.AddToast, {
          id: `${meta.profile.key}.discord-feedback-success`,
          icon: 'ph--discord-logo--regular',
          duration: 5000,
          title: ['discord-feedback-toast.label', { ns: meta.profile.key }],
          description: ['discord-feedback-toast.description', { ns: meta.profile.key }],
          closeLabel: ['close.label', { ns: osTranslations }],
        });
      } catch {
        popup?.close();
        await invokePromise(LayoutOperation.UpdateComplementary, { state: 'collapsed' });
        await invokePromise(LayoutOperation.AddToast, {
          id: `${meta.profile.key}.feedback-success`,
          icon: 'ph--paper-plane-tilt--regular',
          duration: 3000,
          title: ['feedback-toast.label', { ns: meta.profile.key }],
          description: ['feedback-toast.description', { ns: meta.profile.key }],
          closeLabel: ['close.label', { ns: osTranslations }],
        });
      }
    },
    [invokePromise, discordServiceUrl, posthogProjectId, attachScreenshot],
  );

  // Nothing to offer without the service: rendering the button would submit into a no-op, and the
  // panel's own "Send feedback" action already covers the PostHog-only path.
  if (!discordServiceUrl) {
    return null;
  }

  return (
    <>
      <FeedbackForm.SubmitDiscord onSubmit={handleDiscord} disabled={disabled} />
      <FeedbackForm.DiscordPresence discordPresence={discordPresence ?? undefined} />
    </>
  );
};

DiscordAction.displayName = 'DiscordAction';
