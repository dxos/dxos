//
// Copyright 2026 DXOS.org
//

import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { Icon, Toolbar, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export type MagazineSort = 'date' | 'rank';

export type CurateState = 'idle' | 'syncing' | 'curating';

export type MagazineToolbarProps = ComponentPropsWithoutRef<typeof Toolbar.Root> & {
  sort: MagazineSort;
  onSortChange: (sort: MagazineSort) => void;
  onlyStarred: boolean;
  onOnlyStarredChange: (value: boolean) => void;
  showArchived: boolean;
  onShowArchivedChange: (value: boolean) => void;
  state: CurateState;
  curateDisabled: boolean;
  curateTooltip?: string;
  onClear: () => void;
  onCurate: () => void;
};

// Forwards ref + spreads passthrough props so this component composes under `Panel.Toolbar asChild`.
export const MagazineToolbar = forwardRef<HTMLDivElement, MagazineToolbarProps>((props, forwardedRef) => {
  const {
    sort,
    onSortChange,
    onlyStarred,
    onOnlyStarredChange,
    showArchived,
    onShowArchivedChange,
    state,
    curateDisabled,
    curateTooltip,
    onClear,
    onCurate,
    ...rest
  } = props;
  const { t } = useTranslation(meta.id);

  return (
    <Toolbar.Root {...rest} ref={forwardedRef}>
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
        value={onlyStarred ? 'on' : ''}
        onValueChange={(value) => onOnlyStarredChange(value === 'on')}
      >
        <Toolbar.ToggleGroupItem value='on' aria-label={t('only-starred.label')} title={t('only-starred.label')}>
          <Icon icon={onlyStarred ? 'ph--star--fill' : 'ph--star--regular'} size={4} />
        </Toolbar.ToggleGroupItem>
      </Toolbar.ToggleGroup>
      <Toolbar.ToggleGroup
        type='single'
        value={showArchived ? 'show' : ''}
        onValueChange={(value) => onShowArchivedChange(value === 'show')}
      >
        <Toolbar.ToggleGroupItem value='show' aria-label={t('show-archived.label')} title={t('show-archived.label')}>
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
