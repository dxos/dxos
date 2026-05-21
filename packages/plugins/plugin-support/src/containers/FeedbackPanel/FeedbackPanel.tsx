//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useEffect, useState } from 'react';

import { useCapabilities, useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { runAndForwardErrors } from '@dxos/effect';
import { ObservabilityCapabilities } from '@dxos/plugin-observability';
import { useConfig } from '@dxos/react-client';
import { useAsyncEffect } from '@dxos/react-hooks';
import { osTranslations } from '@dxos/ui-theme';

import { FeedbackForm } from '#components';
import { meta } from '#meta';
import { SupportOperation } from '#types';

import { DISCORD_SERVICE_URL as DISCORD_SERVICE_URL_DEFAULT } from '../../constants';

/** Build a direct PostHog event permalink (±15s search window via timestamp). */
const makePostHogEventUrl = (projectId: string, eventUuid: string): string =>
  `https://eu.posthog.com/project/${projectId}/events/${eventUuid}/${encodeURIComponent(new Date().toISOString())}`;

type DiscordPresence = { teamOnline: number; communityOnline: number };

/** Fetches presence counts from the discord-presence Edge service, refreshing every 60 seconds. */
const useDiscordPresence = (presenceUrl: string | undefined): DiscordPresence | null => {
  const [presence, setPresence] = useState<DiscordPresence | null>(null);

  useEffect(() => {
    if (!presenceUrl) {
      return;
    }

    const fetchPresence = async (signal: AbortSignal) => {
      try {
        const response = await fetch(`${presenceUrl}/presence`, { signal });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as DiscordPresence;
        setPresence({ teamOnline: data.teamOnline, communityOnline: data.communityOnline });
      } catch {
        // Non-essential indicator — fail silently.
      }
    };

    const controller = new AbortController();
    void fetchPresence(controller.signal);
    const interval = setInterval(() => void fetchPresence(controller.signal), 60_000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [presenceUrl]);

  return presence;
};

/** Renders the feedback form, disabling it when the feedback survey is unavailable. */
export const FeedbackPanel = () => {
  const { invokePromise } = useOperationInvoker();
  const observability = useCapability(ObservabilityCapabilities.Observability);
  const [downloadLogs] = useCapabilities(ObservabilityCapabilities.LogDownloader);
  const [feedbackAvailable, setFeedbackAvailable] = useState(false);
  const config = useConfig();

  const posthogProjectId = config.values.runtime?.app?.env?.DX_POSTHOG_PROJECT_ID as string | undefined;
  const discordServiceUrl =
    (config.values.runtime?.app?.env?.DX_DISCORD_SERVICE_URL as string | undefined) ?? DISCORD_SERVICE_URL_DEFAULT;

  const discordPresence = useDiscordPresence(discordServiceUrl);

  useAsyncEffect(
    async (controller) => {
      const available = await observability.isAvailable('feedback').pipe(
        Effect.catchAll(() => Effect.succeed(false)),
        Effect.catchAllDefect(() => Effect.succeed(false)),
        runAndForwardErrors,
      );
      if (!controller.signal.aborted) {
        setFeedbackAvailable(available);
      }
    },
    [observability],
  );

  const handleSave = useCallback(
    async (values: SupportOperation.UserFeedback) => {
      await invokePromise(SupportOperation.CaptureUserFeedback, values);
      await invokePromise(LayoutOperation.UpdateComplementary, { state: 'collapsed' });
      await invokePromise(LayoutOperation.AddToast, {
        id: `${meta.id}.feedback-success`,
        icon: 'ph--paper-plane-tilt--regular',
        duration: 3000,
        title: ['feedback-toast.label', { ns: meta.id }],
        description: ['feedback-toast.description', { ns: meta.id }],
        closeLabel: ['close.label', { ns: osTranslations }],
      });
    },
    [invokePromise],
  );

  const handleDiscord = useCallback(
    async (values: SupportOperation.UserFeedback) => {
      if (!discordServiceUrl) {
        return;
      }

      // PostHog submission is the primary path — if it fails the error propagates
      // and no misleading toast is shown.
      const { data: eventUuid } = await invokePromise(SupportOperation.CaptureUserFeedback, values);

      // Discord thread creation is best-effort; fall back to the PostHog toast on any error.
      try {
        const postHogEventUrl =
          posthogProjectId && eventUuid ? makePostHogEventUrl(posthogProjectId, eventUuid) : undefined;
        const res = await fetch(`${discordServiceUrl}/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: values.message, postHogEventUrl }),
        });
        if (!res.ok) {
          throw new Error(`Discord service returned ${res.status}`);
        }
        const { threadUrl } = (await res.json()) as { threadUrl: string };
        window.open(threadUrl, '_blank', 'noopener,noreferrer');
        await invokePromise(LayoutOperation.UpdateComplementary, { state: 'collapsed' });
        await invokePromise(LayoutOperation.AddToast, {
          id: `${meta.id}.discord-feedback-success`,
          icon: 'ph--discord-logo--regular',
          duration: 5000,
          title: ['discord-feedback-toast.label', { ns: meta.id }],
          description: ['discord-feedback-toast.description', { ns: meta.id }],
          closeLabel: ['close.label', { ns: osTranslations }],
        });
      } catch {
        await invokePromise(LayoutOperation.UpdateComplementary, { state: 'collapsed' });
        await invokePromise(LayoutOperation.AddToast, {
          id: `${meta.id}.feedback-success`,
          icon: 'ph--paper-plane-tilt--regular',
          duration: 3000,
          title: ['feedback-toast.label', { ns: meta.id }],
          description: ['feedback-toast.description', { ns: meta.id }],
          closeLabel: ['close.label', { ns: osTranslations }],
        });
      }
    },
    [invokePromise, discordServiceUrl, posthogProjectId],
  );

  return (
    <FeedbackForm
      onSave={handleSave}
      onDiscord={handleDiscord}
      discordPresence={discordPresence ?? undefined}
      disabled={!feedbackAvailable}
      onDownloadLogs={downloadLogs}
    />
  );
};
