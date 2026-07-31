//
// Copyright 2026 DXOS.org
//

import React, { forwardRef, useCallback, useState } from 'react';

import { useAtomCapabilityState, useOperationInvoker } from '@dxos/app-framework/ui';
import { type Type } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { Card, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { ObjectForm } from '@dxos/react-ui-form';

import { meta } from '#meta';

import { SpaceOperation } from '../../operations';
import { SpaceCapabilities } from '../../types';

export type MergePreviewProps = {
  type: Type.AnyEntity;
  spaceId: SpaceId;
  preview: SpaceCapabilities.MergePreview;
};

/**
 * Confirmation panel for a proposed merge: a form over the *detached* merged object. Nothing is
 * written until Confirm, which invokes `MergeDuplicates` with the edited preview as overrides —
 * so the user's corrections survive the merge rather than being recomputed away.
 */
export const MergePreview = forwardRef<HTMLDivElement, MergePreviewProps>(
  ({ type, spaceId, preview }, forwardedRef) => {
    const { t } = useTranslation(meta.profile.key);
    const { invokePromise } = useOperationInvoker();
    const [, updateEphemeral] = useAtomCapabilityState(SpaceCapabilities.EphemeralState);

    const clear = useCallback(
      () => updateEphemeral((state) => ({ ...state, mergePreview: undefined })),
      [updateEphemeral],
    );

    // The merge removes objects, so a second click would re-run it against ids the first call has
    // already deleted. Confirm is disabled for the duration.
    const [merging, setMerging] = useState(false);
    const handleConfirm = useCallback(() => {
      setMerging(true);
      void invokePromise(
        SpaceOperation.MergeDuplicates,
        { typename: preview.typename, objectIds: preview.objectIds, overrides: preview.preview },
        { spaceId },
      )
        .then(({ error }) => {
          if (error) {
            // Leave the preview up: the merge did not happen, and clearing it would look like it did.
            log.warn('merge failed', { error });
            return;
          }
          // Bumping the timestamp is what tells the open review to rescan; without it the group the
          // user just merged stays on screen as a one-member "duplicate".
          updateEphemeral((state) => ({ ...state, mergePreview: undefined, lastMergeAt: Date.now() }));
        })
        .finally(() => setMerging(false));
    }, [invokePromise, preview, spaceId, updateEphemeral]);

    return (
      <Panel.Root ref={forwardedRef}>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Toolbar.Button variant='primary' disabled={merging} onClick={handleConfirm}>
              {t('confirm-merge.label')}
            </Toolbar.Button>
            <Toolbar.Button variant='ghost' disabled={merging} onClick={clear}>
              {t('cancel-merge.label')}
            </Toolbar.Button>
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content>
          <ScrollArea.Root orientation='vertical' centered>
            <ScrollArea.Viewport>
              <Card.Root fullWidth classNames='pb-form-gap'>
                <ObjectForm object={preview.preview} type={type} />
              </Card.Root>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Content>
      </Panel.Root>
    );
  },
);

MergePreview.displayName = 'MergePreview';
