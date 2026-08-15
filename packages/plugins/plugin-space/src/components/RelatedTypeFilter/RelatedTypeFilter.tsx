//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { ToggleGroup, ToggleGroupIconItem, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type RelatedType } from '#hooks';
import { meta } from '#meta';

export type RelatedTypeFilterProps = {
  types: RelatedType[];
  onToggle: (typename: string) => void;
  classNames?: string;
};

/**
 * Toggles which types a related-object view shows, one item per type present in the set.
 *
 * Uses the standalone `ToggleGroup` because the record's section header, one of its two hosts, has
 * no toolbar to supply the roving-focus context `Toolbar.ToggleGroup` requires.
 */
export const RelatedTypeFilter = ({ types, onToggle, classNames }: RelatedTypeFilterProps) => {
  const { t } = useTranslation(meta.profile.key);
  // Filtering by the only type present cannot narrow anything.
  if (types.length < 2) {
    return null;
  }

  return (
    <ToggleGroup
      type='multiple'
      aria-label={t('type-filter.label')}
      // Gapped, so each type reads as its own control rather than one segmented bar; grouped
      // buttons drop their own rounding, which the gap makes visible again.
      classNames={mx('gap-1 [&>button]:rounded-xs', classNames)}
      value={types.filter(({ visible }) => visible).map(({ typename }) => typename)}
    >
      {types.map(({ typename, label, icon, count }) => (
        <ToggleGroupIconItem
          key={typename}
          iconOnly
          value={typename}
          icon={icon}
          // Selection reads off the icon alone: the pressed fill is pinned to the resting one so
          // the chip itself never changes, leaving `text-subdued` to mark a type as hidden.
          classNames='aria-pressed:bg-input-bg aria-[pressed=false]:text-subdued'
          // Carries the count to the tooltip; the type's label is already localized.
          label={`${label} (${count})`}
          onClick={() => onToggle(typename)}
        />
      ))}
    </ToggleGroup>
  );
};

RelatedTypeFilter.displayName = 'RelatedTypeFilter';
