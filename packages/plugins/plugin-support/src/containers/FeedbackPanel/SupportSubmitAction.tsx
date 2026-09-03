//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { EdgeServiceName, getEnvString } from '@dxos/config';
import { useIdentity } from '@dxos/halo-react';
import { useConfig, useEdgeServiceEndpoint } from '@dxos/react-client';
import { useTranslation } from '@dxos/react-ui';
import { osTranslations } from '@dxos/ui-theme';

import { FeedbackForm, type FeedbackSubmitHandler } from '#components';
import { useDiscordPresence } from '#hooks';
import { meta } from '#meta';
import { SupportOperation } from '#types';

import { formatPublicMessage, formatRequestMessage } from './request';
import { useScreenshotAttachment } from './useScreenshotAttachment';

export type SupportSubmitActionProps = {
  disabled?: boolean;
};

/**
 * The one submit path: files the report as a PostHog support ticket anchoring its telemetry, then
 * asks the discord-presence Edge service to open the public help thread and takes the user there.
 * A Discord-side failure never loses the ticket — the success toast falls back to the plain one.
 */
export const SupportSubmitAction = ({ disabled }: SupportSubmitActionProps) => {
  const { invokePromise } = useOperationInvoker();
  const { t } = useTranslation(meta.profile.key);
  const config = useConfig();
  const identity = useIdentity();

  const discordEndpoint = useEdgeServiceEndpoint(EdgeServiceName.Discord);
  const discordServiceUrl = getEnvString(config, 'DX_DISCORD_SERVICE_URL') ?? discordEndpoint;

  const discordPresence = useDiscordPresence(discordServiceUrl);
  const attachScreenshot = useScreenshotAttachment();

  const handleSubmit = useCallback<FeedbackSubmitHandler>(
    async (values) => {
      // Capture before submitting, while the reported screen is still on-screen.
      const screenshot = await attachScreenshot(values);
      const message = formatRequestMessage(values, screenshot.url, identity?.did);

      const { data: ticketId } = await invokePromise(SupportOperation.CreateSupportTicket, {
        message,
        includeLogs: values.includeLogs,
      });

      // Nothing public to open without the service: the ticket is filed and the toast says so.
      if (!discordServiceUrl) {
        await invokePromise(LayoutOperation.UpdateComplementary, { state: 'collapsed' });
        await invokePromise(LayoutOperation.AddToast, {
          id: `${meta.profile.key}.feedback-success`,
          icon: 'ph--paper-plane-tilt--regular',
          duration: 3000,
          title: ['feedback-toast.label', { ns: meta.profile.key }],
          description: ['feedback-toast.description', { ns: meta.profile.key }],
          closeLabel: ['close.label', { ns: osTranslations }],
        });
        return;
      }

      // Open a blank popup synchronously while user activation is still valid.
      // Navigating it after the async work avoids popup-blocker policies.
      const popup = window.open('', '_blank');

      // Thread creation is best-effort; the ticket is already filed, so fall back to the plain toast.
      try {
        const res = await fetch(`${discordServiceUrl}/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: formatPublicMessage(values), ticketId }),
        });
        if (!res.ok) {
          throw new Error(`Discord service returned ${res.status}`);
        }

        const { threadUrl } = (await res.json()) as { threadUrl?: string };
        if (!threadUrl) {
          throw new Error('Discord service did not return a thread URL');
        }
        // The pre-opened popup is our only way to navigate after the await; if it was blocked,
        // fall through to the plain toast rather than claiming a Discord thread opened.
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
    [invokePromise, discordServiceUrl, identity, attachScreenshot],
  );

  return (
    <>
      <p className='text-xs text-description text-center px-2 py-1'>{t('public-report.notice')}</p>
      <FeedbackForm.Submit onSubmit={handleSubmit} disabled={disabled} />
      <FeedbackForm.DiscordPresence discordPresence={discordPresence ?? undefined} />
    </>
  );
};

SupportSubmitAction.displayName = 'SupportSubmitAction';
