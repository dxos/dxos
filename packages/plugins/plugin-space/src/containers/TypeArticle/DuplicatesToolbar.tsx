//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useAtomCapabilityState } from '@dxos/app-framework/ui';
import { Icon, Toolbar, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import { SpaceCapabilities } from '../../types';
import { type UseDuplicatesResult, buildMergePreview } from './useDuplicates';

export type DuplicatesToolbarProps = {
  typename: string;
  typeUri: string;
  duplicates: UseDuplicatesResult;
};

/**
 * Replaces the text filter while reviewing duplicates: Merge raises a preview into the companion,
 * Skip and the arrows walk the groups. Merge never writes — it stages a detached preview the
 * companion confirms, so backing out of a review leaves the space untouched.
 */
export const DuplicatesToolbar = ({ typename, typeUri, duplicates }: DuplicatesToolbarProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [, updateEphemeral] = useAtomCapabilityState(SpaceCapabilities.EphemeralState);
  const { spec, current, position, total, next, previous, refresh } = duplicates;

  const handleMerge = useCallback(() => {
    const preview = buildMergePreview(spec, current);
    if (!preview) {
      return;
    }
    updateEphemeral((state) => ({
      ...state,
      mergePreview: { typeUri, typename, objectIds: current.map((object) => object.id), preview },
    }));
  }, [updateEphemeral, spec, current, typeUri, typename]);

  // Every control that changes which group is under review drops the staged preview: it belongs to
  // the group it was raised from, and leaving it up would show the companion previewing one group
  // while the article shows another.
  const clearPreview = useCallback(
    () => updateEphemeral((state) => ({ ...state, mergePreview: undefined })),
    [updateEphemeral],
  );

  const handleSkip = useCallback(() => {
    clearPreview();
    next();
  }, [clearPreview, next]);

  const handleNext = useCallback(() => {
    clearPreview();
    next();
  }, [clearPreview, next]);

  const handlePrevious = useCallback(() => {
    clearPreview();
    previous();
  }, [clearPreview, previous]);

  const handleRefresh = useCallback(() => {
    clearPreview();
    refresh();
  }, [clearPreview, refresh]);

  return (
    // Own `Toolbar.Root`: `Panel.Toolbar` here is a plain flex container (it hosts the search input
    // in the other layouts), and `Toolbar.Button` needs the roving-focus group a Root provides.
    // `w-auto!` overrides the toolbar theme's `w-full`, which would otherwise claim the whole row and
    // push the layout toggle past the panel's edge; `min-w-0` lets it scroll its own overflow instead.
    <Toolbar.Root classNames='w-auto! grow min-w-0 p-0! bg-transparent!'>
      <Toolbar.Button variant='primary' disabled={current.length < 2} onClick={handleMerge}>
        {t('merge-duplicates.label')}
      </Toolbar.Button>
      <Toolbar.Button variant='ghost' disabled={current.length === 0} onClick={handleSkip}>
        {t('skip-duplicates.label')}
      </Toolbar.Button>
      <Toolbar.Separator />
      <Toolbar.Button variant='ghost' disabled={position <= 1} onClick={handlePrevious}>
        <Icon icon='ph--caret-left--regular' />
      </Toolbar.Button>
      <span className='text-description text-sm tabular-nums'>
        {total === 0 ? t('duplicates-none.label') : `${position} / ${total}`}
      </span>
      <Toolbar.Button variant='ghost' disabled={position >= total} onClick={handleNext}>
        <Icon icon='ph--caret-right--regular' />
      </Toolbar.Button>
      <Toolbar.Button variant='ghost' onClick={handleRefresh}>
        <Icon icon='ph--arrows-clockwise--regular' />
      </Toolbar.Button>
    </Toolbar.Root>
  );
};

DuplicatesToolbar.displayName = 'DuplicatesToolbar';
