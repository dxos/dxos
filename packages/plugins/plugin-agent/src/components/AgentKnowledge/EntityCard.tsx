//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Tag from '@dxos/react-ui/Tag';

import { meta } from '#meta';

import { type EntityCardModel, type EntityCardProperty, type EntityCardValue, propertyKey } from './subgraph.ts';

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
  /** The card is the chosen one of its set. */
  selected?: boolean;
  /** The property row (a `propertyKey`) that is the current one. */
  currentProperty?: string;
  /** Makes the card itself selectable. */
  onClick?: () => void;
  /** Makes each property row selectable. */
  onSelectProperty?: (key: string) => void;
  /** Opens the entity a chip names; `key` is the row it sits in. */
  onSelect?: (id: string, key: string) => void;
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
          <Tag.Tag
            key={value.id}
            hue='sky'
            onClick={
              onSelect
                ? (event) => {
                    // The chip sits in a selectable row in a selectable card; only the chip's selection applies.
                    event.stopPropagation();
                    onSelect(value.id);
                  }
                : undefined
            }
          >
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
  direction,
  properties,
  icon,
  icons,
  currentProperty,
  onSelectProperty,
  onSelect,
}: Pick<EntityCardProps, 'icons' | 'currentProperty' | 'onSelectProperty' | 'onSelect'> & {
  direction: 'out' | 'in';
  properties: readonly EntityCardProperty[];
  icon: string;
}) =>
  properties.map((property) => {
    const key = propertyKey(direction, property.predicate);
    return (
      <Card.Row
        key={key}
        icon={icons?.[property.predicate] ?? icon}
        current={currentProperty === key}
        onClick={
          onSelectProperty
            ? (event) => {
                event.stopPropagation();
                onSelectProperty(key);
              }
            : undefined
        }
        data-testid='entity-card-property'
      >
        <KeyValue label={property.label}>
          <Values values={property.values} onSelect={onSelect ? (id) => onSelect(id, key) : undefined} />
        </KeyValue>
      </Card.Row>
    );
  });

/**
 * One entity of the graph as a card: its class, its name, what it states about others, and below a rule what others
 * state about it.
 */
export const EntityCard = ({
  card,
  icons,
  selected,
  currentProperty,
  onClick,
  onSelectProperty,
  onSelect,
  onClose,
}: EntityCardProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const rows = { icons, currentProperty, onSelectProperty, onSelect };
  return (
    <Card.Root grid selected={selected} onClick={onClick} data-testid='entity-card'>
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
      <PropertyRows direction='out' properties={card.properties} icon={PROPERTY_ICON} {...rows} />
      {card.inverse.length > 0 && (
        <>
          <Layout.Separator />
          <PropertyRows direction='in' properties={card.inverse} icon={INVERSE_ICON} {...rows} icons={undefined} />
        </>
      )}
    </Card.Root>
  );
};

EntityCard.displayName = 'EntityCard';
