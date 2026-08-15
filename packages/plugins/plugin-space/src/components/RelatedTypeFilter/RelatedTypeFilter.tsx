//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { ToggleGroup, ToggleGroupIconItem, useTranslation } from '@dxos/react-ui';

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
 * Renders nothing for fewer than two types: filtering by the only type present is a no-op control.
 * Built on the standalone `ToggleGroup` rather than `Toolbar.ToggleGroup` so it can sit either in a
 * panel toolbar (the Related companion) or in a section header (the record's inline section), the
 * latter having no toolbar to provide the roving-focus context a toolbar item requires.
 */
export const RelatedTypeFilter = ({ types, onToggle, classNames }: RelatedTypeFilterProps) => {
  const { t } = useTranslation(meta.profile.key);
  if (types.length < 2) {
    return null;
  }

  return (
    <ToggleGroup
      type='multiple'
      aria-label={t('type-filter.label')}
      classNames={classNames}
      value={types.filter(({ visible }) => visible).map(({ typename }) => typename)}
    >
      {types.map(({ typename, label, icon, count }) => (
        <ToggleGroupIconItem
          key={typename}
          value={typename}
          icon={icon}
          // The type's label is already localized; only the count is appended.
          label={`${label} (${count})`}
          onClick={() => onToggle(typename)}
        />
      ))}
    </ToggleGroup>
  );
};

RelatedTypeFilter.displayName = 'RelatedTypeFilter';
