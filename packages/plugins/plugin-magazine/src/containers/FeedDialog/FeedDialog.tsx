//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Obj } from '@dxos/echo';
import { Button, Dialog, useTranslation } from '@dxos/react-ui';
import { ObjectForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { type Magazine, Subscription } from '#types';

export type FeedDialogProps = {
  /** The feed being created; already in the database so the form can write straight through to it. */
  feed: Subscription.Subscription;
  /** The magazine it was added to, so cancelling can take it back out. */
  magazine: Magazine.Magazine;
};

/**
 * Create-a-feed dialog.
 *
 * The subscription is added to the database (and to the magazine) *before* the dialog opens, so the
 * form edits a live object rather than a draft — which is what lets the URL-driven autofill and the
 * feed's own properties surface behave exactly as they do after creation. Dismissing the dialog by any
 * route other than the confirm button removes it again, so a cancelled create leaves nothing behind.
 */
export const FeedDialog = ({ feed, magazine }: FeedDialogProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();

  // Cleanup on unmount rather than on the cancel button: escape, the overlay, and the close affordance
  // all dismiss the dialog without ever reaching a handler, and each of them is a cancel.
  const committed = useRef(false);
  useEffect(() => {
    return () => {
      if (committed.current) {
        return;
      }

      Obj.update(magazine, (magazine) => {
        magazine.feeds = magazine.feeds.filter((ref) => ref.target !== feed);
      });
      Obj.getDatabase(feed)?.remove(feed);
    };
  }, [feed, magazine]);

  const handleConfirm = useCallback(() => {
    committed.current = true;
    void invokePromise(LayoutOperation.UpdateDialog, { state: false });
  }, [invokePromise]);

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{t('feed-dialog.title')}</Dialog.Title>
      </Dialog.Header>
      <Dialog.Body>
        <Dialog.Description classNames='sr-only'>{t('feed-dialog.description')}</Dialog.Description>
        <ObjectForm object={feed} type={Subscription.Subscription} showTags={false} />
      </Dialog.Body>
      <Dialog.ActionBar>
        <Dialog.Close asChild>
          <Button>{t('feed-dialog-cancel.label')}</Button>
        </Dialog.Close>
        <Button variant='primary' onClick={handleConfirm}>
          {t('feed-dialog-confirm.label')}
        </Button>
      </Dialog.ActionBar>
    </Dialog.Content>
  );
};

FeedDialog.displayName = 'FeedDialog';
