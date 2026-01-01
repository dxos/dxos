//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Common } from '@dxos/app-framework';
import { useOperationInvoker } from '@dxos/app-framework/react';

import { meta } from '../meta';
import { ObservabilityOperation, type UserFeedback } from '../types';

import { FeedbackForm } from './FeedbackForm';

export const HelpContainer = () => {
  const { invokePromise } = useOperationInvoker();

  const handleSave = useCallback(
    async (values: UserFeedback) => {
      await invokePromise(ObservabilityOperation.CaptureUserFeedback, values);
      await invokePromise(Common.LayoutOperation.UpdateComplementary, { state: 'collapsed' });
      await invokePromise(Common.LayoutOperation.AddToast, {
        id: `${meta.id}/feedback-success`,
        icon: 'ph--paper-plane-tilt--regular',
        duration: 3000,
        title: ['feedback toast label', { ns: meta.id }],
        description: ['feedback toast description', { ns: meta.id }],
        closeLabel: ['close label', { ns: 'os' }],
      });
    },
    [invokePromise],
  );

  return <FeedbackForm onSave={handleSave} />;
};
