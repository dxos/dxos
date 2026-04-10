//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Filter, Query } from '@dxos/echo';
import { Trigger } from '@dxos/functions';
import { useTranslation } from '@dxos/react-ui';
import { type FormFieldComponentProps, SelectField, useFormFieldState } from '@dxos/react-ui-form';

import { meta } from '#meta';

export type SpecSelectorProps = FormFieldComponentProps;

export const SpecSelector = (props: SpecSelectorProps) => {
  const { t } = useTranslation(meta.id);
  const specProps = useFormFieldState(SpecSelector.displayName, ['spec' satisfies keyof Trigger.Trigger]);

  const handleTypeChange = useCallback(
    (_type: any, value: string): Trigger.Spec | undefined => {
      const getDefaultTriggerSpec = (kind: string) => {
        switch (kind) {
          case 'timer':
            return { kind: 'timer', cron: '' };
          case 'subscription':
            return {
              kind: 'subscription',
              query: {
                ast: Query.select(Filter.nothing()).ast,
              },
            };
          case 'queue':
            return { kind: 'queue', queue: 'dxn:queue:default' };
          case 'email':
            return { kind: 'email' };
          case 'webhook':
            return { kind: 'webhook' };
          default:
            return undefined;
        }
      };

      const defaultSpec = getDefaultTriggerSpec(value);
      if (!defaultSpec) {
        return;
      }

      // Update the entire spec object, not just the `spec.kind`.
      specProps.onValueChange(props.type, defaultSpec);
    },
    [props.type, specProps],
  );

  const kindLabels: Record<string, string> = {
    timer: t('trigger-type.timer.label'),
    webhook: t('trigger-type.webhook.label'),
    websocket: t('trigger-type.websocket.label'),
    subscription: t('trigger-type.subscription.label'),
    email: t('trigger-type.email.label'),
    queue: t('trigger-type.queue.label'),
  };

  const options = useMemo(
    () =>
      Trigger.Kinds.map((kind) => ({
        value: kind,
        label: kindLabels[kind],
      })),
    [t],
  );

  return <SelectField {...props} options={options} onValueChange={handleTypeChange} />;
};

SpecSelector.displayName = 'Form.SpecSelector';
