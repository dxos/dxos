//
// Copyright 2025 DXOS.org
//

// Object properties surface — per-object settings panel.
// This appears in the object properties companion pane (the gear icon)
// and receives the specific ECHO object as `subject`.
//
// The base object properties (provided by plugin-space) already renders a form
// for the object's schema fields. This surface demonstrates custom settings UI
// for actions and controls that go beyond simple field editing.

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Next, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { SampleItem, SampleOperation } from '#types';

export type SamplePropertiesProps = {
  subject: SampleItem.SampleItem;
};

export const SampleProperties = ({ subject }: SamplePropertiesProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();

  const handleRandomize = useCallback(() => {
    void invokePromise(SampleOperation.Randomize, { item: subject });
  }, [invokePromise, subject]);

  return (
    <Next.Field.Root>
      <Next.Field.Label>{t('randomize-item.label')}</Next.Field.Label>
      <Next.Field.HelperText>{t('randomize-item-description.label')}</Next.Field.HelperText>
      <Next.Button onClick={handleRandomize}>{t('randomize-item.label')}</Next.Button>
    </Next.Field.Root>
  );
};

export default SampleProperties;

SampleProperties.displayName = 'SampleProperties';
