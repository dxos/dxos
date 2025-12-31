//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Common, createIntent } from '@dxos/app-framework';
import { useIntentDispatcher } from '@dxos/app-framework/react';

import { meta } from '../meta';
import { ObservabilityAction, type UserFeedback } from '../types';

import { FeedbackForm } from './FeedbackForm';

export const HelpContainer = () => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const handleSave = useCallback(
    async (values: UserFeedback) => {
      await dispatch(createIntent(ObservabilityAction.CaptureUserFeedback, values));
      await dispatch(
        createIntent(Common.LayoutAction.UpdateComplementary, {
          part: 'complementary',
          options: { state: 'collapsed' },
        }),
      );
      await dispatch(
        createIntent(Common.LayoutAction.AddToast, {
          part: 'toast',
          subject: {
            id: `${meta.id}/feedback-success`,
            icon: 'ph--paper-plane-tilt--regular',
            duration: 3000,
            title: ['feedback toast label', { ns: meta.id }],
            description: ['feedback toast description', { ns: meta.id }],
            closeLabel: ['close label', { ns: 'os' }],
          },
        }),
      );
    },
    [dispatch],
  );

  return <FeedbackForm onSave={handleSave} />;
};
