//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { osTranslations } from '@dxos/ui-theme';

import { FeedbackForm, type FeedbackSubmitHandler } from '#components';
import { meta } from '#meta';
import { SupportOperation } from '#types';

import { formatRequestMessage } from './request.ts';
import { useScreenshotAttachment } from './useScreenshotAttachment.ts';

export type FeedbackSubmitActionProps = {
  disabled?: boolean;
};

/**
 * Primary submit: captures the request via PostHog (Observability `CaptureUserFeedback`), then
 * collapses the companion and toasts success.
 */
export const FeedbackSubmitAction = ({ disabled }: FeedbackSubmitActionProps) => {
  const { invokePromise } = useOperationInvoker();
  const attachScreenshot = useScreenshotAttachment();

  const handleSave = useCallback<FeedbackSubmitHandler>(
    async (values) => {
      // Capture before submitting: the collapse + capture must happen while the reported screen is
      // still on-screen, and a failed attachment never blocks the report.
      const screenshot = await attachScreenshot(values);
      await invokePromise(SupportOperation.CaptureUserFeedback, {
        message: formatRequestMessage(values, screenshot.url),
        includeLogs: values.includeLogs,
      });
      await invokePromise(LayoutOperation.UpdateComplementary, {
        state: 'collapsed',
      });
      await invokePromise(LayoutOperation.AddToast, {
        id: `${meta.profile.key}.feedback-success`,
        icon: 'ph--paper-plane-tilt--regular',
        title: ['feedback-toast.label', { ns: meta.profile.key }],
        description: screenshot.failed
          ? ['feedback-toast-no-screenshot.description', { ns: meta.profile.key }]
          : ['feedback-toast.description', { ns: meta.profile.key }],
        closeLabel: ['close.label', { ns: osTranslations }],
        duration: 3_000,
      });
    },
    [invokePromise, attachScreenshot],
  );

  return <FeedbackForm.SubmitPosthog onSubmit={handleSave} disabled={disabled} />;
};

FeedbackSubmitAction.displayName = 'FeedbackSubmitAction';
