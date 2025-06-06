//
// Copyright 2025 DXOS.org
//

import { pipe } from 'effect';
import React, { useCallback } from 'react';

import { chain, createIntent, LayoutAction, useIntentDispatcher } from '@dxos/app-framework';

import { FeedbackForm } from './FeedbackForm';
import { OBSERVABILITY_PLUGIN } from '../meta';
import { ObservabilityAction, type UserFeedback } from '../types';

export const HelpContainer = () => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const handleSave = useCallback(
    (values: UserFeedback) =>
      dispatch(
        pipe(
          createIntent(ObservabilityAction.CaptureUserFeedback, values),
          chain(LayoutAction.UpdateComplementary, { part: 'complementary', options: { state: 'collapsed' } }),
          chain(LayoutAction.AddToast, {
            part: 'toast',
            subject: {
              id: `${OBSERVABILITY_PLUGIN}/feedback-success`,
              icon: 'ph--paper-plane-tilt--regular',
              duration: 3000,
              title: ['feedback toast label', { ns: OBSERVABILITY_PLUGIN }],
              description: ['feedback toast description', { ns: OBSERVABILITY_PLUGIN }],
              closeLabel: ['close label', { ns: 'os' }],
            },
          }),
        ),
      ),
    [dispatch],
  );

  return <FeedbackForm onSave={handleSave} />;
};
