//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Icon, Toolbar, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/ui-theme';

import { meta } from '#meta';

export type MagazineSort = 'date' | 'rank';

/**
 * Tile filter mode. Mutually exclusive — `default` shows everything except archived,
 * `starred` filters to starred posts, `archived` shows only archived posts.
 */
export type MagazineView = 'default' | 'starred' | 'archived';

export type CurateState = 'idle' | 'busy';

export type MagazineToolbarProps = {
  sort: MagazineSort;
  onSortChange: (sort: MagazineSort) => void;
  view: MagazineView;
  onViewChange: (view: MagazineView) => void;
  state: CurateState;
  curateDisabled: boolean;
  curateTooltip?: string;
  onClear: () => void;
  onCurate: () => void;
};

export const MagazineToolbar = composable<HTMLDivElement, MagazineToolbarProps>((props, forwardedRef) => {
  const { t } = useTranslation(meta.id);
  const { sort, onSortChange, view, onViewChange, state, curateDisabled, curateTooltip, onClear, onCurate, ...rest } =
    props;

  return (
    <Toolbar.Root {...composableProps(rest)} ref={forwardedRef}>
      <Toolbar.ToggleGroup
        type='single'
        value={sort}
        onValueChange={(value) => {
          if (value === 'date' || value === 'rank') {
            onSortChange(value);
          }
        }}
      >
        <Toolbar.ToggleGroupItem value='date' aria-label={t('sort-by-date.label')} title={t('sort-by-date.label')}>
          <Icon icon='ph--calendar--regular' size={4} />
        </Toolbar.ToggleGroupItem>
        <Toolbar.ToggleGroupItem value='rank' aria-label={t('sort-by-rank.label')} title={t('sort-by-rank.label')}>
          <Icon icon='ph--list-numbers--regular' size={4} />
        </Toolbar.ToggleGroupItem>
      </Toolbar.ToggleGroup>
      <Toolbar.ToggleGroup
        type='single'
        value={view}
        // Radix returns '' when the user toggles the active item off; treat that as 'default'.
        onValueChange={(value) => {
          if (value === 'starred' || value === 'archived') {
            onViewChange(value);
          } else {
            onViewChange('default');
          }
        }}
      >
        <Toolbar.ToggleGroupItem value='starred' aria-label={t('only-starred.label')} title={t('only-starred.label')}>
          <Icon icon={view === 'starred' ? 'ph--star--fill' : 'ph--star--regular'} size={4} />
        </Toolbar.ToggleGroupItem>
        <Toolbar.ToggleGroupItem
          value='archived'
          aria-label={t('show-archived.label')}
          title={t('show-archived.label')}
        >
          <Icon icon='ph--archive--regular' size={4} />
        </Toolbar.ToggleGroupItem>
      </Toolbar.ToggleGroup>
      <Toolbar.Separator />
      <Toolbar.IconButton
        label={t('clear-magazine.label')}
        icon='ph--eraser--regular'
        iconOnly
        disabled={state !== 'idle'}
        onClick={onClear}
      />
      <Toolbar.IconButton
        label={curateTooltip ?? t('curate.label')}
        icon={state === 'idle' ? 'ph--sparkle--regular' : 'ph--circle-notch--regular'}
        iconClassNames={state !== 'idle' ? 'animate-spin' : undefined}
        iconOnly
        disabled={curateDisabled}
        onClick={onCurate}
      />
    </Toolbar.Root>
  );
});

MagazineToolbar.displayName = 'MagazineToolbar';
