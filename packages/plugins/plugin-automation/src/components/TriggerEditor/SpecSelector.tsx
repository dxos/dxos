//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Trigger } from '@dxos/compute';
import { Filter, Query } from '@dxos/echo';
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
            return Trigger.specTimer('');
          case 'subscription':
            return Trigger.specSubscription(Query.select(Filter.nothing()));
          case 'feed':
            return { kind: 'feed' } satisfies Trigger.FeedSpec;
          case 'email':
            return Trigger.specEmail();
          case 'webhook':
            return Trigger.specWebhook();
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
    feed: t('trigger-type.feed.label'),
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
