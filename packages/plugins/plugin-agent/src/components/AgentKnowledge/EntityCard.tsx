//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Tag from '@dxos/react-ui/Tag';
import * as Util from '@dxos/react-ui/Util';
import { getHashHue } from '@dxos/ui-theme';

import { AgentNamespace } from '../../namespace.ts';
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
  /** Chip hues by entity type; a hue hashed from the type otherwise, so an unlisted type still keeps one colour. */
  hues?: Readonly<Record<string, Tag.TagHue>>;
  /** The card is the chosen one of its set. */
  selected?: boolean;
  /** The property row (a `propertyKey`) that is the current one. */
  currentProperty?: string;
  /** Makes the card itself selectable. */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  /** Makes each property row selectable. */
  onSelectProperty?: (key: string) => void;
  /** Opens the entity a chip names; `key` is the row it sits in. */
  onSelect?: (id: string, key: string) => void;
  onClose?: () => void;
};

export type EntityCardFieldProps = { label: string; children: React.ReactNode };

/**
 * A key and its value side by side, the key a fixed width so the values line up down the card: the read-only form row
 * every knowledge card (entities, predicates) is built from. A text value goes in `Card.Text`, whose block padding the
 * key's has, so their first lines share a baseline.
 */
export const EntityCardField = ({ label, children }: EntityCardFieldProps) => (
  // Top-aligned, so a key stays on its value's first line when the value wraps (a description, a run of chips).
  <Layout.Grid cols={['6rem', 'fill']} gap='sm' align='start'>
    <Card.Text variant='muted' truncate>
      {label}
    </Card.Text>
    <Layout.Flex wrap gap='xs'>
      {children}
    </Layout.Flex>
  </Layout.Grid>
);

const Values = ({
  values,
  hues,
  onSelect,
}: {
  values: readonly EntityCardValue[];
  hues?: EntityCardProps['hues'];
  onSelect?: (id: string) => void;
}) => {
  const { t } = Hooks.useTranslation(AgentNamespace.key);
  const entities = values.filter((value) => value.kind === 'entity');
  // Text values (a memory's claims) are sentences, not links, so the card counts them; choosing the row opens them.
  const statements = values.length - entities.length;
  const rest = entities.length - MAX_VALUES;
  return (
    <>
      {entities.slice(0, MAX_VALUES).map((value) =>
        value.kind === 'entity' ? (
          <Tag.Tag
            key={value.id}
            // One hue per class, so a card's people, places and papers read apart at a glance.
            hue={(value.type && hues?.[value.type]) || getHashHue(value.type)}
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
      {statements > 0 && (
        <Card.Text data-testid='entity-card-statements'>
          {t('entity-card-statements.label', { count: statements })}
        </Card.Text>
      )}
    </>
  );
};

const PropertyRows = ({
  direction,
  properties,
  icon,
  icons,
  hues,
  currentProperty,
  onSelectProperty,
  onSelect,
}: Pick<EntityCardProps, 'icons' | 'hues' | 'currentProperty' | 'onSelectProperty' | 'onSelect'> & {
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
        // A value can wrap onto several lines (a run of chips), so the icon stays with the key's line.
        align='start'
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
        <EntityCardField label={property.label}>
          <Values values={property.values} hues={hues} onSelect={onSelect ? (id) => onSelect(id, key) : undefined} />
        </EntityCardField>
      </Card.Row>
    );
  });

/**
 * One entity of the graph as a card: its class, its name, what it states about others, and below a rule what others
 * state about it.
 */
// Composable, so a `Focus.Item` (or another `asChild` host) can make the card one of its arrow-key stops.
export const EntityCard = Util.composable<HTMLDivElement, EntityCardProps>(
  (
    { card, icons, hues, selected, currentProperty, onClick, onSelectProperty, onSelect, onClose, ...props },
    forwardedRef,
  ) => {
    const { t } = Hooks.useTranslation(AgentNamespace.key);
    const rows = { icons, hues, currentProperty, onSelectProperty, onSelect };
    return (
      <Card.Root
        {...props}
        grid
        selected={selected}
        onClick={onClick}
        data-testid='entity-card'
        data-entity-id={card.id}
        ref={forwardedRef}
      >
        <Card.Row icon={TYPE_ICON} end={onClose && <Card.Action system='close' onClick={onClose} />}>
          <EntityCardField label={t('entity-card-type.label')}>
            <Card.Text truncate>{card.type ?? '-'}</Card.Text>
          </EntityCardField>
        </Card.Row>
        <Card.Row icon={NAME_ICON}>
          <EntityCardField label={t('entity-card-name.label')}>
            <Card.Text truncate>{card.label}</Card.Text>
          </EntityCardField>
        </Card.Row>
        <PropertyRows direction='out' properties={card.properties} icon={PROPERTY_ICON} {...rows} />
        <PropertyRows direction='in' properties={card.inverse} icon={INVERSE_ICON} {...rows} icons={undefined} />
      </Card.Root>
    );
  },
);

EntityCard.displayName = 'EntityCard';
