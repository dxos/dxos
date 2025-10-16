//
// Copyright 2025 DXOS.org
//

import * as Function from 'effect/Function';
import React, { useCallback } from 'react';

import { LayoutAction, chain, createIntent, useIntentDispatcher } from '@dxos/app-framework';

import { meta } from '../meta';
import { ObservabilityAction, type UserFeedback } from '../types';

import { FeedbackForm } from './FeedbackForm';

export const HelpContainer = () => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const handleSave = useCallback(
    (values: UserFeedback) =>
      dispatch(
        Function.pipe(
          createIntent(ObservabilityAction.CaptureUserFeedback, values),
          chain(LayoutAction.UpdateComplementary, { part: 'complementary', options: { state: 'collapsed' } }),
          chain(LayoutAction.AddToast, {
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
        ),
      ),
    [dispatch],
  );

  return <FeedbackForm onSave={handleSave} />;
};
