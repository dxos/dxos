//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { osTranslations } from '@dxos/ui-theme';

import { FeedbackForm, type FeedbackSubmitHandler } from '#components';
import { meta } from '#meta';
import { SupportOperation } from '#types';

import { formatRequestMessage } from './request';

export type FeedbackSubmitActionProps = {
  disabled?: boolean;
};

/**
 * Primary submit: captures the request via PostHog (Observability `CaptureUserFeedback`), then
 * collapses the companion and toasts success.
 */
export const FeedbackSubmitAction = ({ disabled }: FeedbackSubmitActionProps) => {
  const { invokePromise } = useOperationInvoker();

  const handleSave = useCallback<FeedbackSubmitHandler>(
    async (values) => {
      await invokePromise(SupportOperation.CaptureUserFeedback, {
        message: formatRequestMessage(values),
        includeLogs: values.includeLogs,
      });
      await invokePromise(LayoutOperation.UpdateComplementary, {
        state: 'collapsed',
      });
      await invokePromise(LayoutOperation.AddToast, {
        id: `${meta.id}.feedback-success`,
        icon: 'ph--paper-plane-tilt--regular',
        title: ['feedback-toast.label', { ns: meta.id }],
        description: ['feedback-toast.description', { ns: meta.id }],
        closeLabel: ['close.label', { ns: osTranslations }],
        duration: 3_000,
      });
    },
    [invokePromise],
  );

  return <FeedbackForm.SubmitPosthog onSubmit={handleSave} disabled={disabled} />;
};
