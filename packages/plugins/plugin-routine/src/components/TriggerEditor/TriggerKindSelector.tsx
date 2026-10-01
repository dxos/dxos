//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list/next';

import { meta } from '#meta';

import { OPTIONS } from './trigger-kind-icon.ts';

/** Trigger spec kinds surfaced as selectable variants. Matches the discriminants of `Trigger.Spec`. */
export type TriggerKind = 'timer' | 'feed' | 'subscription' | 'webhook' | 'email';

export type TriggerKindOption = {
  kind: TriggerKind;
  icon: string;
  disabled?: boolean;
};

// Ordered as presented; labels and descriptions are resolved from translations keyed by `kind`.

export type TriggerKindSelectorProps = {
  onChange: (kind: TriggerKind) => void;
};

/**
 * Single-select list of pluggable trigger variants (Schedule / Feed / Query / Webhook / Email): each row
 * shows an icon, title and description. Built on {@link Listbox} (role=listbox/option, arrow-key navigation);
 * selecting a row emits its kind. Selection is transient — the parent swaps in the variant editor on change.
 */
export const TriggerKindSelector = ({ onChange }: TriggerKindSelectorProps) => {
  const { t } = useTranslation(meta.profile.key);
  const handleValueChange = useCallback(
    (id: string) => {
      const option = OPTIONS.find((option) => option.kind === id);
      if (option) {
        onChange(option.kind);
      }
    },
    [onChange],
  );

  return (
    <Listbox.Root
      onValueChange={handleValueChange}
      items={OPTIONS.map(({ kind, icon, disabled }) => ({
        value: kind,
        label: t(`trigger-kind.${kind}.label`),
        description: t(`trigger-kind.${kind}.description`),
        icon,
        disabled,
      }))}
    >
      <Listbox.Content classNames='gap-1' aria-label={t('trigger-kind.placeholder')}>
        {OPTIONS.map(({ kind }) => (
          <Listbox.Item key={kind} id={kind} classNames='dx-input-surface rounded-sm'>
            <Listbox.ItemIcon classNames='text-description' />
            <Listbox.ItemText classNames='font-medium' />
            <Listbox.ItemDescription />
          </Listbox.Item>
        ))}
      </Listbox.Content>
    </Listbox.Root>
  );
};
