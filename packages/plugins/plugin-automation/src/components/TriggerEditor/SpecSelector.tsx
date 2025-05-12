//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type FunctionTriggerType, TriggerKind, type TriggerType } from '@dxos/functions';
import { useTranslation } from '@dxos/react-ui';
import { SelectInput, type InputProps, useInputProps } from '@dxos/react-ui-form';

import { AUTOMATION_PLUGIN } from '../../meta';

export type SpecSelectorProps = InputProps;

export const SpecSelector = (props: SpecSelectorProps) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  const specProps = useInputProps(['spec' satisfies keyof FunctionTriggerType]);

  const handleTypeChange = useCallback(
    (_type: any, value: string): TriggerType | undefined => {
      const getDefaultTriggerSpec = (kind: string) => {
        switch (kind) {
          case TriggerKind.Timer:
            return { type: TriggerKind.Timer, cron: '' };
          case TriggerKind.Subscription:
            return { type: TriggerKind.Subscription, filter: {} };
          case TriggerKind.Queue:
            return { type: TriggerKind.Queue, queue: '' };
          case TriggerKind.Email:
            return { type: TriggerKind.Email };
          case TriggerKind.Webhook:
            return { type: TriggerKind.Webhook };
          default:
            return undefined;
        }
      };

      const defaultSpec = getDefaultTriggerSpec(value);
      if (!defaultSpec) {
        return;
      }

      // Update the entire spec object, not just the `spec.type`.
      specProps.onValueChange('object', defaultSpec);
    },
    [specProps],
  );

  const options = useMemo(
    () =>
      Object.values(TriggerKind).map((kind) => ({
        value: kind,
        label: t(`trigger type ${kind}`),
      })),
    [t],
  );

  return <SelectInput {...props} options={options} onValueChange={handleTypeChange} />;
};
