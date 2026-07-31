//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { Icon, useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';

import { meta } from '#meta';

/** Trigger spec kinds surfaced as selectable variants. Matches the discriminants of `Trigger.Spec`. */
export type TriggerKind = 'timer' | 'feed' | 'subscription' | 'webhook' | 'email';

type TriggerKindOption = {
  kind: TriggerKind;
  icon: string;
  disabled?: boolean;
};

// Ordered as presented; labels and descriptions are resolved from translations keyed by `kind`.
const OPTIONS: readonly TriggerKindOption[] = [
  {
    kind: 'timer',
    icon: 'ph--clock-countdown--regular',
  },
  {
    kind: 'feed',
    icon: 'ph--cards-three--regular',
  },
  {
    kind: 'subscription',
    icon: 'ph--funnel--regular',
  },
  {
    kind: 'webhook',
    icon: 'ph--webhooks-logo--regular',
    disabled: true,
  },
  {
    kind: 'email',
    icon: 'ph--envelope--regular',
    disabled: true,
  },
];

/** Icon for a trigger kind, shared by the picker rows and the selected-variant editor header. */
export const getTriggerKindIcon = (kind: TriggerKind): string =>
  OPTIONS.find((option) => option.kind === kind)?.icon ?? 'ph--lightning--regular';

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
    <Listbox.Root onValueChange={handleValueChange}>
      <Listbox.Content classNames='gap-1' aria-label={t('trigger-kind.placeholder')}>
        {OPTIONS.map(({ kind, icon, disabled }) => (
          <Listbox.Item key={kind} id={kind} disabled={disabled} classNames='bg-input-surface rounded-sm'>
            <Listbox.ItemContent
              icon={<Icon icon={icon} size={5} classNames='text-description' />}
              title={<span className='font-medium'>{t(`trigger-kind.${kind}.label`)}</span>}
              description={t(`trigger-kind.${kind}.description`)}
            />
          </Listbox.Item>
        ))}
      </Listbox.Content>
    </Listbox.Root>
  );
};
