//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { Column, Icon, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

/** Trigger spec kinds surfaced as selectable variants. Matches the discriminants of `Trigger.Spec`. */
export type TriggerKind = 'timer' | 'feed' | 'subscription' | 'webhook' | 'email';

type TriggerKindOption = {
  kind: TriggerKind;
  icon: string;
};

// Ordered as presented; labels and descriptions are resolved from translations keyed by `kind`.
const OPTIONS: readonly TriggerKindOption[] = [
  { kind: 'timer', icon: 'ph--clock-countdown--regular' },
  { kind: 'feed', icon: 'ph--cards-three--regular' },
  { kind: 'subscription', icon: 'ph--funnel--regular' },
  { kind: 'webhook', icon: 'ph--webhooks-logo--regular' },
  { kind: 'email', icon: 'ph--envelope--regular' },
];

/** Icon for a trigger kind, shared by the picker cards and the selected-variant editor header. */
export const getTriggerKindIcon = (kind: TriggerKind): string =>
  OPTIONS.find((option) => option.kind === kind)?.icon ?? 'ph--lightning--regular';

export type TriggerKindSelectorProps = {
  onChange: (kind: TriggerKind) => void;
};

/**
 * Radio-card list of pluggable trigger variants (Schedule / Query / Webhook / Feed / Email): each row is laid
 * out on the shared {@link Column} grid — icon in the leading gutter, title and description in the center
 * column — so the cards align with the selected-variant editor. Selecting a card sets the kind.
 */
export const TriggerKindSelector = ({ onChange }: TriggerKindSelectorProps) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <Column.Root role='radiogroup' classNames='gap-y-1'>
      {OPTIONS.map(({ kind, icon }) => (
        <TriggerKindCard
          key={kind}
          icon={icon}
          label={t(`trigger-kind.${kind}.label`)}
          description={t(`trigger-kind.${kind}.description`)}
          onSelect={() => onChange(kind)}
        />
      ))}
    </Column.Root>
  );
};

type TriggerKindCardProps = {
  icon: string;
  label: string;
  description: string;
  onSelect: () => void;
};

const TriggerKindCard = ({ icon, label, description, onSelect }: TriggerKindCardProps) => {
  const handleClick = useCallback(() => onSelect(), [onSelect]);
  return (
    <Column.Row asChild role='radio'>
      <button type='button' onClick={handleClick} className='text-start rounded-sm dx-hover'>
        <Column.Block>
          <Icon icon={icon} classNames='text-description' />
        </Column.Block>
        <div className='flex flex-col'>
          <div className='flex h-8 items-center'>{label}</div>
          <div className='-mt-1 pb-1 text-sm text-description'>{description}</div>
        </div>
      </button>
    </Column.Row>
  );
};
