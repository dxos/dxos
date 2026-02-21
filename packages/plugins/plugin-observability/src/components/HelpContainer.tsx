//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useState } from 'react';

import { useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { runAndForwardErrors } from '@dxos/effect';
import { useAsyncEffect } from '@dxos/react-hooks';
import { osTranslations } from '@dxos/ui-theme';

import { meta } from '../meta';
import { ObservabilityCapabilities, ObservabilityOperation, type UserFeedback } from '../types';

import { FeedbackForm } from './FeedbackForm';

/** Renders the feedback form, disabling it when the feedback survey is unavailable. */
export const HelpContainer = () => {
  const { invokePromise } = useOperationInvoker();
  const observability = useCapability(ObservabilityCapabilities.Observability);
  const [feedbackAvailable, setFeedbackAvailable] = useState(false);

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
    async (values: UserFeedback) => {
      await invokePromise(ObservabilityOperation.CaptureUserFeedback, values);
      await invokePromise(LayoutOperation.UpdateComplementary, { state: 'collapsed' });
      await invokePromise(LayoutOperation.AddToast, {
        id: `${meta.id}/feedback-success`,
        icon: 'ph--paper-plane-tilt--regular',
        duration: 3000,
        title: ['feedback toast label', { ns: meta.id }],
        description: ['feedback toast description', { ns: meta.id }],
        closeLabel: ['close label', { ns: osTranslations }],
      });
    },
    [invokePromise],
  );

  return <FeedbackForm onSave={handleSave} disabled={!feedbackAvailable} />;
};
