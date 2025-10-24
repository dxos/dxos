//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Filter, Query } from '@dxos/echo';
import { Trigger } from '@dxos/functions';
import { useTranslation } from '@dxos/react-ui';
import { type InputProps, SelectInput, useInputProps } from '@dxos/react-ui-form';

import { meta } from '../../meta';

export type SpecSelectorProps = InputProps;

export const SpecSelector = (props: SpecSelectorProps) => {
  const { t } = useTranslation(meta.id);
  const specProps = useInputProps(['spec' satisfies keyof Trigger.Trigger]);

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
            return { kind: 'queue', queue: 'dxn:' };
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
      specProps.onValueChange('object', defaultSpec);
    },
    [specProps],
  );

  const options = useMemo(
    () =>
      Trigger.Kinds.map((kind) => ({
        value: kind,
        label: t(`trigger type ${kind}`),
      })),
    [t],
  );

  return <SelectInput {...props} options={options} onValueChange={handleTypeChange} />;
};
