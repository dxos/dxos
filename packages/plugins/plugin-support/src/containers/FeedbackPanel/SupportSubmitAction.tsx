//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { useIdentity } from '@dxos/halo-react';
import { log } from '@dxos/log';
import { useConfig } from '@dxos/react-client';
import { useTranslation } from '@dxos/react-ui';
import { osTranslations } from '@dxos/ui-theme';

import { FeedbackForm, type FeedbackSubmitHandler } from '#components';
import { useDiscordPresence } from '#hooks';
import { meta } from '#meta';
import { SupportOperation } from '#types';

import { useScreenshotAttachment } from './useScreenshotAttachment';

type Toast = {
  id: string;
  icon: string;
  duration: number;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * The one submit path: the support service files the PostHog ticket, notes where the logs went,
 * and opens the public help thread; this takes the user there. No ticket means the form stays
 * open with an error toast. A thread that failed to open never loses the ticket; the success
 * toast just falls back to the plain one.
 *
 * The thread is handed over through the toast's "Open thread" button, never opened by the app: the
 * URL comes back well past the few seconds a browser honours `window.open` after a click, so an
 * automatic open was blocked more often than not. The toast stays until dismissed, since the button
 * is the only way to the thread.
 */
export const useSupportSubmit = (): FeedbackSubmitHandler => {
  const { invokePromise } = useOperationInvoker();
  const identity = useIdentity();
  const attachScreenshot = useScreenshotAttachment();

  return useCallback(
    async (values) => {
      const namespace = { ns: meta.profile.key };
      const showToast = (toast: Toast) =>
        invokePromise(LayoutOperation.AddToast, {
          id: `${meta.profile.key}.${toast.id}`,
          icon: toast.icon,
          duration: toast.duration,
          title: [toast.title, namespace],
          ...(toast.description ? { description: [toast.description, namespace] } : {}),
          closeLabel: ['close.label', { ns: osTranslations }],
          ...(toast.actionLabel && toast.onAction
            ? {
                actionLabel: [toast.actionLabel, namespace],
                actionAlt: [toast.actionLabel, namespace],
                onAction: toast.onAction,
              }
            : {}),
        });
      const collapse = () => invokePromise(LayoutOperation.UpdateComplementary, { state: 'collapsed' });

      // Capture before submitting, while the reported screen is still on-screen.
      const screenshot = await attachScreenshot(values);

      const { data: result, error } = await invokePromise(SupportOperation.SubmitReport, {
        report: values,
        did: identity?.did,
        screenshotUrl: screenshot.url,
      });
      if (error || !result) {
        // The panel stays open so nothing the user typed is lost.
        log.error('support report not filed', { error });
        await showToast({
          id: 'feedback-failed',
          icon: 'ph--warning--regular',
          duration: 5000,
          title: 'feedback-failed-toast.label',
          description: 'feedback-failed-toast.description',
        });
        return;
      }

      await collapse();
      if (result.threadUrl) {
        const threadUrl = result.threadUrl;
        await showToast({
          id: 'discord-feedback-success',
          icon: 'ph--discord-logo--regular',
          duration: Infinity,
          title: 'discord-feedback-toast.label',
          actionLabel: 'discord-feedback-toast.action',
          onAction: () => window.open(threadUrl, '_blank'),
        });
        return;
      }
      await showToast({
        id: 'feedback-success',
        icon: 'ph--paper-plane-tilt--regular',
        duration: 3000,
        title: 'feedback-toast.label',
        description: screenshot.failed ? 'feedback-toast-no-screenshot.description' : 'feedback-toast.description',
      });
    },
    [invokePromise, identity, attachScreenshot],
  );
};

/**
 * The submit affordance for {@link useSupportSubmit}: the public-post notice, the button, and who
 * is online. Disabled when no support service is configured, since nothing could file the report.
 */
export const SupportSubmitAction = () => {
  const { t } = useTranslation(meta.profile.key);
  const config = useConfig();
  const endpoint = SupportOperation.supportEndpoint(config);
  const discordPresence = useDiscordPresence(endpoint);

  return (
    <>
      <p className='text-xs text-description text-center px-2 py-1'>{t('public-report.description')}</p>
      <FeedbackForm.Submit variant='discord' disabled={!endpoint} />
      <FeedbackForm.DiscordPresence discordPresence={discordPresence ?? undefined} />
    </>
  );
};

SupportSubmitAction.displayName = 'SupportSubmitAction';
