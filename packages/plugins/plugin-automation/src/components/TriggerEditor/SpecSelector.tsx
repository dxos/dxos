//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type FunctionTriggerType, TriggerKind, type TriggerType } from '@dxos/functions';
import { useTranslation } from '@dxos/react-ui';
import { type InputProps, SelectInput, useInputProps } from '@dxos/react-ui-form';

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
            return { kind: TriggerKind.Timer, cron: '' };
          case TriggerKind.Subscription:
            return { kind: TriggerKind.Subscription, filter: {} };
          case TriggerKind.Queue:
            return { kind: TriggerKind.Queue, queue: '' };
          case TriggerKind.Email:
            return { kind: TriggerKind.Email };
          case TriggerKind.Webhook:
            return { kind: TriggerKind.Webhook };
          default:
            return undefined;
        }
      };

      const defaultSpec = getDefaultTriggerSpec(value);
      if (!defaultSpec) {
        return;
      }

      // Update the entire spec object, not just the `spec.kind`.
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
