//
// Copyright 2026 DXOS.org
//

import React, { createContext, useContext, useMemo, useState } from 'react';

import { useListSelection } from '@dxos/react-ui-list';
import { Masonry } from '@dxos/react-ui-masonry';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Tag from '@dxos/react-ui/Tag';

import { meta } from '#meta';

import {
  FEATURE_STATUS_STYLE,
  FeatureCard,
  type FeatureChanges,
  type FeatureLookup,
  type FeatureModel,
  type FeatureStatus,
  type FeatureTarget,
  cardOpenHandlers,
  getFeatureRelation,
  makeFeatureLookup,
} from '../FeatureCard/index.ts';

const STATUSES: FeatureStatus[] = ['failing', 'planned', 'in-progress', 'prototype', 'operational'];

/** Which cards the board shows: those matching the text, in any pressed status (none pressed shows every status). */
export type FeatureFilter = {
  query: string;
  statuses: ReadonlySet<FeatureStatus>;
};

export const EMPTY_FEATURE_FILTER: FeatureFilter = { query: '', statuses: new Set() };

/** The features a filter keeps, matching its text against the name and description. */
export const filterFeatures = (features: readonly FeatureModel[], { query, statuses }: FeatureFilter) => {
  const text = query.trim().toLowerCase();
  return features.filter(
    (feature) =>
      (statuses.size === 0 || statuses.has(feature.status)) &&
      (!text || `${feature.name} ${feature.description ?? ''}`.toLowerCase().includes(text)),
  );
};

export type FeatureBoardFilterProps = {
  features: readonly FeatureModel[];
  value: FeatureFilter;
  onValueChange: (value: FeatureFilter) => void;
};

/**
 * The board's filter field and a toggleable tag per status, rendered without a container so a host can place them in its own
 * row or toolbar. The status counts are the toggles, so each says how many cards it adds.
 */
export const FeatureBoardFilter = ({ features, value, onValueChange }: FeatureBoardFilterProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const toggleStatus = (status: FeatureStatus, pressed: boolean) => {
    const statuses = new Set(value.statuses);
    if (pressed) {
      statuses.add(status);
    } else {
      statuses.delete(status);
    }
    onValueChange({ ...value, statuses });
  };

  return (
    <>
      <Input.Root
        placeholder={t('feature-board.filter.placeholder')}
        aria-label={t('feature-board.filter.placeholder')}
        value={value.query}
        classNames='grow min-w-0'
        data-testid='feature-board.filter'
        onChange={(event) => onValueChange({ ...value, query: event.target.value })}
      />
      <Layout.Flex gap='xs' classNames='shrink-0 items-center ms-2'>
        {STATUSES.map((status) => {
          const count = features.filter((feature) => feature.status === status).length;
          const pressed = value.statuses.has(status);
          // A pressed status stays shown at zero, or its filter would hide the cards with no toggle left to clear it.
          return (
            (count > 0 || pressed) && (
              // Neutral until pressed, then the status's own tag colour, as the cards show it.
              <Tag.Tag
                key={status}
                hue={pressed ? FEATURE_STATUS_STYLE[status].hue : 'neutral'}
                aria-pressed={pressed}
                onClick={() => toggleStatus(status, !pressed)}
                data-testid={`feature-board.status.${status}`}
              >
                <Icon.Icon icon={FEATURE_STATUS_STYLE[status].icon} size='xs' />
                {t(`feature-status.${status}.label`)}
                <span className='text-xs tabular-nums'>({count})</span>
              </Tag.Tag>
            )
          );
        })}
      </Layout.Flex>
    </>
  );
};

export type FeatureBoardProps = {
  features: readonly FeatureModel[];
  /** Controlled filter, for a host that shows {@link FeatureBoardFilter} itself; the board then renders none. */
  filter?: FeatureFilter;
  /** Controlled selection; uncontrolled when omitted. */
  selectedId?: string;
  /** The card selected when the board opens, as for a link to one feature; the user can then select others. */
  defaultSelectedId?: string;
  onSelect?: (id: string | undefined) => void;
  /** Opens a feature, or something a card lists. */
  onOpen?: (target: FeatureTarget) => void;
  /** Takes a feature off its project; the feature itself is kept. */
  onRemove?: (id: string) => void;
  /** Make each card's name and description editable in place. */
  onChange?: (id: string, changes: FeatureChanges) => void;
  /** The card whose name field is open, as for a feature just created; cleared when it closes. */
  editingId?: string;
  onEditingChange?: (id: string | undefined) => void;
};

type FeatureTileContextValue = Omit<FeatureBoardProps, 'features' | 'selectedId' | 'defaultSelectedId' | 'onSelect'> & {
  lookup: FeatureLookup;
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
};

/** Masonry tiles get only their item, so the board's selection and edits reach them through context. */
const FeatureTileContext = createContext<FeatureTileContextValue>({
  lookup: () => undefined,
  onSelect: () => {},
});

const FeatureTile = ({ data: feature }: { data: FeatureModel }) => {
  const { lookup, selectedId, onSelect, onOpen, onRemove, onChange, editingId, onEditingChange } =
    useContext(FeatureTileContext);
  const selected = selectedId ? lookup(selectedId) : undefined;
  const relation = getFeatureRelation(feature, selected);
  const faded = selected && feature.id !== selected.id && !relation;
  // Controlled only for a host that tracks it; otherwise the edit button's toggle would be overridden.
  const editing = onEditingChange ? feature.id === editingId : undefined;
  return (
    // Masonry's tile is the arrow-key item and holds the selection; the card is its content, and only opens.
    <div
      className={faded ? 'opacity-40 transition-opacity' : 'transition-opacity'}
      {...cardOpenHandlers(onOpen && (() => onOpen({ type: 'object', id: feature.id })), { disabled: editing })}
    >
      {/* Not `selected`: a selected card would show more and grow, and the masonry reflow on every arrow key. */}
      <FeatureCard.Root
        feature={feature}
        lookup={lookup}
        relation={relation}
        onOpen={onOpen}
        onChange={onChange ? (feature, changes) => onChange(feature.id, changes) : undefined}
        editing={editing}
        onEditingChange={(editing) => onEditingChange?.(editing ? feature.id : undefined)}
      >
        <FeatureCard.Header>
          <FeatureCard.Status />
          <FeatureCard.Title />
          <FeatureCard.Save />
          <FeatureCard.Menu onRemove={onRemove ? (feature) => onRemove(feature.id) : undefined} />
        </FeatureCard.Header>
        <FeatureCard.Body>
          <FeatureCard.Description />
          <FeatureCard.Tags />
          <FeatureCard.SubfeatureCount />
          <FeatureCard.TaskCount />
          <FeatureCard.TestCount />
          <FeatureCard.ShowcaseLead />
          <FeatureCard.DependencyCount />
        </FeatureCard.Body>
      </FeatureCard.Root>
    </div>
  );
};

/**
 * The cards view of a project's features: one card per feature, under a count per status.
 * Selecting a card labels the features it needs and the features that need it, and fades the rest,
 * so a dependency chain reads without drawing edges.
 */
export const FeatureBoard = ({
  features,
  filter: filterProp,
  selectedId: selectedIdProp,
  defaultSelectedId,
  onSelect,
  onOpen,
  onRemove,
  onChange,
  editingId,
  onEditingChange,
}: FeatureBoardProps) => {
  const [selectedIdState, setSelectedIdState] = useState<string | undefined>(defaultSelectedId);
  const selectedId = selectedIdProp ?? selectedIdState;
  const lookup = useMemo(() => makeFeatureLookup(features), [features]);
  const [filterState, setFilterState] = useState<FeatureFilter>(EMPTY_FEATURE_FILTER);
  const filter = filterProp ?? filterState;
  const shown = useMemo(() => filterFeatures(features, filter), [features, filter]);

  const handleSelect = (id: string | undefined) => {
    setSelectedIdState(id);
    onSelect?.(id);
  };
  // Single-select: the selected card follows the arrow keys, as in any list; Escape clears it.
  const { bind, clear } = useListSelection({ mode: 'single', value: selectedId, onValueChange: handleSelect });
  const tileContext: FeatureTileContextValue = {
    lookup,
    selectedId,
    onSelect: handleSelect,
    onOpen,
    onRemove,
    onChange,
    editingId,
    onEditingChange,
  };

  return (
    <Layout.Flex column gap='md' classNames='p-3 w-full' data-testid='feature-board'>
      {!filterProp && (
        <Layout.Flex wrap gap='xs' classNames='items-center'>
          <FeatureBoardFilter features={features} value={filterState} onValueChange={setFilterState} />
        </Layout.Flex>
      )}
      {/* The host scrolls the counts and the cards together, so the grid takes no scroll container of its own. */}
      {/* Escape clears the selection, from whichever tile holds focus. */}
      <div onKeyDown={(event) => event.key === 'Escape' && clear()}>
        <FeatureTileContext.Provider value={tileContext}>
          <Masonry.Root Tile={FeatureTile} minColumnWidth={17}>
            <Masonry.Viewport
              items={shown}
              getId={(feature) => feature.id}
              itemProps={(id) => bind(id).rowProps}
              scroll={false}
            />
          </Masonry.Root>
        </FeatureTileContext.Provider>
      </div>
    </Layout.Flex>
  );
};
