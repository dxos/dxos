//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useAtomCapabilityState, useOperationInvoker } from '@dxos/app-framework/ui';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type ActionGroupBuilderFn } from '@dxos/react-ui-menu';

import { meta } from '#meta';
import { SpaceCapabilities, SpaceOperation } from '#types';

import { type UseDuplicatesResult, buildMergePreview } from './useDuplicates.ts';

export type UseDuplicatesGroupOptions = {
  /** URI of the type under review; scopes the staged preview to this article. */
  typeUri: string;
  typename: string;
  spaceId: SpaceId;
  /** Shared selection; a ≥2-member subset of the current group narrows the merge to it. */
  selectedIds: string[];
  duplicates: UseDuplicatesResult;
  /** Called after a confirmed merge with the ids merged away, so the caller can drop them from the selection. */
  onConfirmed?: (objectIds: string[]) => void;
};

/**
 * Toolbar subgraph for the duplicates review: Merge stages a preview, Skip and the arrows walk the
 * groups, and the trailing gap separator pushes whatever follows (the layout toggle) to the far end.
 * While a preview is staged, Confirm/Cancel replace Merge/Skip so the whole review completes within
 * the article; the companion only mirrors the staged preview. Merge never writes — nothing touches
 * the space until Confirm.
 *
 * Compose via `MenuBuilder.subgraph(...)` so the whole toolbar is one action graph rather than
 * several nested `Toolbar.Root`s.
 */
export const useDuplicatesGroup = ({
  typeUri,
  typename,
  spaceId,
  selectedIds,
  duplicates,
  onConfirmed,
}: UseDuplicatesGroupOptions): ActionGroupBuilderFn => {
  const [ephemeral, updateEphemeral] = useAtomCapabilityState(SpaceCapabilities.EphemeralState);
  const { invokePromise } = useOperationInvoker();
  const { spec, current, position, total, scanning, next, previous, refresh } = duplicates;
  const staged = ephemeral.mergePreview?.typeUri === typeUri ? ephemeral.mergePreview : undefined;

  // The merge removes objects, so a second click would re-run it against ids the first call has
  // already deleted. Confirm is disabled for the duration.
  const [merging, setMerging] = useState(false);

  // Every control that changes which group is under review drops the staged preview: it belongs to
  // the group it was raised from, and leaving it up would show the companion previewing one group
  // while the article shows another.
  const clearPreview = useCallback(
    () => updateEphemeral((state) => ({ ...state, mergePreview: undefined })),
    [updateEphemeral],
  );

  const handleMerge = useCallback(() => {
    const selected = current.filter((object) => selectedIds.includes(object.id));
    const participants = selected.length >= 2 ? selected : current;
    const preview = buildMergePreview(spec, participants);
    if (!preview) {
      return;
    }
    updateEphemeral((state) => ({
      ...state,
      mergePreview: { typeUri, typename, objectIds: participants.map((object) => object.id), preview },
    }));
  }, [updateEphemeral, spec, current, selectedIds, typeUri, typename]);

  const handleConfirm = useCallback(() => {
    if (!staged) {
      return;
    }
    setMerging(true);
    void invokePromise(
      SpaceOperation.MergeDuplicates,
      { typename: staged.typename, objectIds: staged.objectIds, overrides: staged.preview },
      { spaceId },
    )
      .then(({ error }) => {
        if (error) {
          // Leave the preview up: the merge did not happen, and clearing it would look like it did.
          log.warn('merge failed', { error });
          return;
        }
        // Bumping the timestamp is what tells the open review to rescan; without it the group the
        // user just merged stays on screen as a one-member "duplicate". Only the preview this
        // operation was raised from is cleared — a preview staged elsewhere mid-flight survives.
        updateEphemeral((state) => ({
          ...state,
          mergePreview: state.mergePreview === staged ? undefined : state.mergePreview,
          lastMergeAt: Date.now(),
        }));
        onConfirmed?.(staged.objectIds);
      })
      .finally(() => setMerging(false));
  }, [staged, invokePromise, spaceId, updateEphemeral, onConfirmed]);

  // Skip and the next arrow are the same move — advance past the group without writing.
  const handleAdvance = useCallback(() => {
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

  return useMemo(
    () => (builder) => {
      if (staged) {
        builder
          .action(
            'confirm-merge',
            {
              label: ['confirm-merge.label', { ns: meta.profile.key }],
              icon: 'ph--check--regular',
              variant: 'primary',
              iconOnly: false,
              disabled: merging,
            },
            handleConfirm,
          )
          .action(
            'cancel-merge',
            {
              label: ['cancel-merge.label', { ns: meta.profile.key }],
              iconOnly: false,
              disabled: merging,
            },
            clearPreview,
          );
      } else {
        builder
          .action(
            'merge',
            {
              label: ['merge-duplicates.label', { ns: meta.profile.key }],
              icon: 'ph--arrows-merge--regular',
              variant: 'primary',
              iconOnly: false,
              disabled: current.length < 2 || merging,
            },
            handleMerge,
          )
          .action(
            'skip',
            {
              label: ['skip-duplicates.label', { ns: meta.profile.key }],
              iconOnly: false,
              // Same bound as the next arrow: skipping past the last group left the counter out of range.
              disabled: position >= total || merging,
            },
            handleAdvance,
          );
      }
      // Every control below clears the staged preview, so all of them freeze while the merge
      // operation is in flight — otherwise a mid-flight clear/restage races the completion handler.
      builder
        .action(
          'rescan',
          {
            label: ['rescan-duplicates.label', { ns: meta.profile.key }],
            icon: 'ph--arrows-clockwise--regular',
            disabled: scanning || merging,
            spin: scanning,
          },
          handleRefresh,
        )
        .subgraph((builder) =>
          total === 0
            ? []
            : builder
                .action(
                  'previous',
                  {
                    label: ['previous-duplicate.label', { ns: meta.profile.key }],
                    icon: 'ph--caret-left--regular',
                    disabled: position <= 1 || merging,
                  },
                  handlePrevious,
                )
                .action(
                  'position',
                  {
                    // The group counter is not an action; `custom` lets the graph carry it so the toolbar stays
                    // a single menu rather than a menu plus a hand-rolled toolbar for one label.
                    variant: 'custom',
                    label: ['duplicates-position.label', { ns: meta.profile.key }],
                    render: () => (
                      <span className='text-description text-sm tabular-nums'>
                        {position} / {total}
                      </span>
                    ),
                  },
                  () => {},
                )
                .action(
                  'next',
                  {
                    label: ['next-duplicate.label', { ns: meta.profile.key }],
                    icon: 'ph--caret-right--regular',
                    disabled: position >= total || merging,
                  },
                  handleAdvance,
                ),
        )
        .separator();
    },
    [
      staged,
      merging,
      current.length,
      position,
      total,
      scanning,
      handleMerge,
      handleConfirm,
      clearPreview,
      handleAdvance,
      handlePrevious,
      handleRefresh,
    ],
  );
};
