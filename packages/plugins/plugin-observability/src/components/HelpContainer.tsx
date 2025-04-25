//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';

import { FeedbackForm } from './FeedbackForm';
import { ObservabilityAction, type UserFeedback } from '../types';

export const HelpContainer = () => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const handleSave = useCallback(
    (values: UserFeedback) => {
      void dispatch(createIntent(ObservabilityAction.CaptureUserFeedback, values));
    },
    [dispatch],
  );

  return <FeedbackForm onSave={handleSave} />;
};
