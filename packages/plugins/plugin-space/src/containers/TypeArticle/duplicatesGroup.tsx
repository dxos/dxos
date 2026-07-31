//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useAtomCapabilityState } from '@dxos/app-framework/ui';
import { type ActionGroupBuilderFn } from '@dxos/react-ui-menu';

import { SpaceCapabilities } from '../../types';
import { type UseDuplicatesResult, buildMergePreview } from './useDuplicates';

export type UseDuplicatesGroupOptions = {
  /** Translation namespace for the action labels. */
  ns: string;
  /** URI of the type under review; scopes the staged preview to this article. */
  typeUri: string;
  typename: string;
  duplicates: UseDuplicatesResult;
};

/**
 * Toolbar subgraph for the duplicates review: Merge stages a preview into the companion, Skip and
 * the arrows walk the groups, and the trailing gap separator pushes whatever follows (the layout
 * toggle) to the far end. Merge never writes — it stages a detached preview the companion confirms,
 * so backing out of a review leaves the space untouched.
 *
 * Compose via `MenuBuilder.subgraph(...)` so the whole toolbar is one action graph rather than
 * several nested `Toolbar.Root`s.
 */
export const useDuplicatesGroup = ({
  ns,
  typeUri,
  typename,
  duplicates,
}: UseDuplicatesGroupOptions): ActionGroupBuilderFn => {
  const [, updateEphemeral] = useAtomCapabilityState(SpaceCapabilities.EphemeralState);
  const { spec, current, position, total, next, previous, refresh } = duplicates;

  // Every control that changes which group is under review drops the staged preview: it belongs to
  // the group it was raised from, and leaving it up would show the companion previewing one group
  // while the article shows another.
  const clearPreview = useCallback(
    () => updateEphemeral((state) => ({ ...state, mergePreview: undefined })),
    [updateEphemeral],
  );

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
      builder
        .action(
          'merge',
          {
            label: ['merge-duplicates.label', { ns }],
            icon: 'ph--arrows-merge--regular',
            variant: 'primary',
            // The two decisions the review exists to collect read as words, not glyphs; the
            // navigation around them stays icon-only.
            iconOnly: false,
            disabled: current.length < 2,
          },
          handleMerge,
        )
        .action(
          'skip',
          {
            label: ['skip-duplicates.label', { ns }],
            icon: 'ph--skip-forward--regular',
            iconOnly: false,
            disabled: total === 0,
          },
          handleAdvance,
        )
        .action(
          'rescan',
          { label: ['rescan-duplicates.label', { ns }], icon: 'ph--arrows-clockwise--regular' },
          handleRefresh,
        )
        .subgraph((builder) =>
          total === 0
            ? []
            : builder
                .action(
                  'previous',
                  {
                    label: ['previous-duplicate.label', { ns }],
                    icon: 'ph--caret-left--regular',
                    disabled: position <= 1,
                  },
                  handlePrevious,
                )
                // The group counter is not an action; `custom` lets the graph carry it so the toolbar stays
                // a single menu rather than a menu plus a hand-rolled toolbar for one label.
                .action(
                  'position',
                  {
                    label: ['duplicates-position.label', { ns }],
                    variant: 'custom',
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
                    label: ['next-duplicate.label', { ns }],
                    icon: 'ph--caret-right--regular',
                    disabled: position >= total,
                  },
                  handleAdvance,
                ),
        )
        .separator();
    },
    [ns, current.length, position, total, handleMerge, handleAdvance, handlePrevious, handleRefresh],
  );
};
