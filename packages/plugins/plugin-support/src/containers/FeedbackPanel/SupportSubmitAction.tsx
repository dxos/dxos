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
import { openExternalUrl } from '@dxos/util';

import { FeedbackForm, type FeedbackSubmitHandler } from '#components';
import { useDiscordPresence } from '#hooks';
import { meta } from '#meta';
import { SupportOperation, SupportService } from '#types';

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
 * The thread URL arrives well past the few seconds a browser honours a popup after a click, so the
 * app never opens it: the toast's action button does, inside a fresh user gesture.
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
      const screenshot = await attachScreenshot(values);

      const { data: result, error } = await invokePromise(SupportOperation.SubmitReport, {
        report: values,
        did: identity?.did,
        screenshotUrl: screenshot.url,
      });
      if (error || !result) {
        log.error('support report not filed', { error });
        await showToast({
          id: 'feedback-failed',
          icon: 'ph--warning--regular',
          duration: 5000,
          title: 'feedback-failed-toast.label',
          description: 'feedback-failed-toast.description',
        });
        return false;
      }

      if (result.threadUrl) {
        const threadUrl = result.threadUrl;
        await showToast({
          id: 'discord-feedback-success',
          icon: 'ph--discord-logo--regular',
          duration: Infinity,
          title: 'discord-feedback-toast.label',
          actionLabel: 'open-thread.label',
          onAction: () => {
            void openExternalUrl(threadUrl);
          },
        });
        return true;
      }
      await showToast({
        id: 'feedback-success',
        icon: 'ph--paper-plane-tilt--regular',
        duration: 3000,
        title: 'feedback-toast.label',
        description: screenshot.failed ? 'feedback-toast-no-screenshot.description' : 'feedback-toast.description',
      });
      return true;
    },
    [invokePromise, identity, attachScreenshot],
  );
};

export const SupportSubmitAction = () => {
  const { t } = useTranslation(meta.profile.key);
  const config = useConfig();
  const endpoint = SupportService.supportEndpoint(config);
  const discordPresence = useDiscordPresence(endpoint);

  return (
    <>
      <FeedbackForm.Submit disabled={!endpoint} />
      <FeedbackForm.DiscordPresence discordPresence={discordPresence ?? undefined} />
    </>
  );
};

SupportSubmitAction.displayName = 'SupportSubmitAction';
