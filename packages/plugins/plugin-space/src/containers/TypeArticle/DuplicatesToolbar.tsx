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

  const handleSkip = useCallback(() => {
    updateEphemeral((state) => ({ ...state, mergePreview: undefined }));
    next();
  }, [updateEphemeral, next]);

  const handleRefresh = useCallback(() => {
    updateEphemeral((state) => ({ ...state, mergePreview: undefined }));
    refresh();
  }, [updateEphemeral, refresh]);

  return (
    <div role='none' className='flex items-center gap-1 grow'>
      <Toolbar.Button variant='primary' disabled={current.length < 2} onClick={handleMerge}>
        {t('merge-duplicates.label')}
      </Toolbar.Button>
      <Toolbar.Button variant='ghost' disabled={current.length === 0} onClick={handleSkip}>
        {t('skip-duplicates.label')}
      </Toolbar.Button>
      <Toolbar.Separator />
      <Toolbar.Button variant='ghost' disabled={position <= 1} onClick={previous}>
        <Icon icon='ph--caret-left--regular' />
      </Toolbar.Button>
      <span className='text-description text-sm tabular-nums'>
        {total === 0 ? t('duplicates-none.label') : `${position} / ${total}`}
      </span>
      <Toolbar.Button variant='ghost' disabled={position >= total} onClick={next}>
        <Icon icon='ph--caret-right--regular' />
      </Toolbar.Button>
      <Toolbar.Button variant='ghost' onClick={handleRefresh}>
        <Icon icon='ph--arrows-clockwise--regular' />
      </Toolbar.Button>
    </div>
  );
};

DuplicatesToolbar.displayName = 'DuplicatesToolbar';
