//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Tag from '@dxos/react-ui/Tag';

import { meta } from '#meta';

import { type EntityCardModel, type EntityCardProperty, type EntityCardValue } from './subgraph.ts';

const TYPE_ICON = 'ph--shapes--regular';
const NAME_ICON = 'ph--identification-card--regular';
const PROPERTY_ICON = 'ph--arrow-right--regular';
const INVERSE_ICON = 'ph--arrow-left--regular';

/** Chips shown per property before the rest collapse into a `+N` chip. */
const MAX_VALUES = 2;

export type EntityCardProps = {
  card: EntityCardModel;
  /** Icons by normalized predicate; an arrow otherwise. */
  icons?: Readonly<Record<string, string>>;
  /** Opens the card for an entity a chip names. */
  onSelect?: (id: string) => void;
  onClose?: () => void;
};

/** A key and its value side by side, the key a fixed width so the values line up down the card. */
const KeyValue = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Layout.Grid cols={['6rem', 'fill']} gap='sm' align='center'>
    <Card.Text variant='muted' truncate>
      {label}
    </Card.Text>
    <Layout.Flex wrap gap='xs'>
      {children}
    </Layout.Flex>
  </Layout.Grid>
);

const Values = ({ values, onSelect }: { values: readonly EntityCardValue[]; onSelect?: (id: string) => void }) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const rest = values.length - MAX_VALUES;
  return (
    <>
      {values.slice(0, MAX_VALUES).map((value) =>
        value.kind === 'entity' ? (
          <Tag.Tag key={value.id} hue='sky' onClick={onSelect ? () => onSelect(value.id) : undefined}>
            {value.label}
          </Tag.Tag>
        ) : (
          <Card.Text key={value.label} truncate>
            {value.label}
          </Card.Text>
        ),
      )}
      {rest > 0 && (
        <Tag.Tag title={t('entity-card-more.description', { count: rest })}>
          {t('entity-card-more.label', { count: rest })}
        </Tag.Tag>
      )}
    </>
  );
};

const PropertyRows = ({
  properties,
  icon,
  icons,
  onSelect,
}: {
  properties: readonly EntityCardProperty[];
  icon: string;
  icons?: Readonly<Record<string, string>>;
  onSelect?: (id: string) => void;
}) =>
  properties.map((property) => (
    <Card.Row key={property.predicate} icon={icons?.[property.predicate] ?? icon} data-testid='entity-card-property'>
      <KeyValue label={property.label}>
        <Values values={property.values} onSelect={onSelect} />
      </KeyValue>
    </Card.Row>
  ));

/**
 * One entity of the graph as a card: its class, its name, what it states about others, and below a rule what others
 * state about it.
 */
export const EntityCard = ({ card, icons, onSelect, onClose }: EntityCardProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Card.Root grid data-testid='entity-card'>
      <Card.Row icon={TYPE_ICON} end={onClose && <Card.Action system='close' onClick={onClose} />}>
        <KeyValue label={t('entity-card-type.label')}>
          <Card.Text truncate>{card.type ?? '—'}</Card.Text>
        </KeyValue>
      </Card.Row>
      <Layout.Separator />
      <Card.Row icon={NAME_ICON}>
        <KeyValue label={t('entity-card-name.label')}>
          <Card.Text truncate>{card.label}</Card.Text>
        </KeyValue>
      </Card.Row>
      <PropertyRows properties={card.properties} icon={PROPERTY_ICON} icons={icons} onSelect={onSelect} />
      {card.inverse.length > 0 && (
        <>
          <Layout.Separator />
          <PropertyRows properties={card.inverse} icon={INVERSE_ICON} onSelect={onSelect} />
        </>
      )}
    </Card.Root>
  );
};

EntityCard.displayName = 'EntityCard';
