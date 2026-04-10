//
// Copyright 2025 DXOS.org
//

// Object settings surface — per-object settings panel.
// This appears in the object settings companion pane (the gear icon)
// and receives the specific ECHO object as `subject`.
//
// The base object settings (provided by plugin-space) already renders a form
// for the object's schema fields. This surface demonstrates custom settings UI
// for actions and controls that go beyond simple field editing.

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Button, Input, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { ExemplarOperation } from '#operations';
import type { ExemplarItem } from '#types';

export type ExemplarObjectSettingsProps = {
  subject: ExemplarItem.ExemplarItem;
};

export const ExemplarObjectSettings = ({ subject }: ExemplarObjectSettingsProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  const handleRandomize = useCallback(() => {
    void invokePromise(ExemplarOperation.Randomize, { item: subject });
  }, [invokePromise, subject]);

  return (
    <Input.Root>
      <Input.Label>{t('randomize-item.label')}</Input.Label>
      <Input.DescriptionAndValidation>{t('randomize-item-description.label')}</Input.DescriptionAndValidation>
      <Button onClick={handleRandomize}>{t('randomize-item.label')}</Button>
    </Input.Root>
  );
};

export default ExemplarObjectSettings;
