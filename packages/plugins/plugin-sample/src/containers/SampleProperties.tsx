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
import { Button, Input, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { SampleOperation } from '#operations';
import type { SampleItem } from '#types';

export type SamplePropertiesProps = {
  subject: SampleItem.SampleItem;
};

export const SampleProperties = ({ subject }: SamplePropertiesProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  const handleRandomize = useCallback(() => {
    void invokePromise(SampleOperation.Randomize, { item: subject });
  }, [invokePromise, subject]);

  return (
    <Input.Root>
      <Input.Label>{t('randomize-item.label')}</Input.Label>
      <Input.DescriptionAndValidation>{t('randomize-item-description.label')}</Input.DescriptionAndValidation>
      <Button onClick={handleRandomize}>{t('randomize-item.label')}</Button>
    </Input.Root>
  );
};

export default SampleProperties;
