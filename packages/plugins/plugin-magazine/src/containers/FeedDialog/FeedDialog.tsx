//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useRef } from 'react';

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
 * feed's own properties surface behave exactly as they do after creation. Cancelling removes it
 * again, so a cancelled create leaves nothing behind.
 *
 * Every dismissal route is wired to the cancel handler explicitly — the button, escape, and a click
 * outside. Hanging the removal off unmount instead looks tidier and is wrong: React remounts a
 * component whenever it feels like it (StrictMode's double-invoke, a Suspense replay, HMR), and each
 * of those destroyed the subscription the moment the dialog opened.
 */
export const FeedDialog = ({ feed, magazine }: FeedDialogProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();

  // Escape and an outside click can both fire alongside the button; the latch keeps the removal (and
  // the close) to once.
  const settled = useRef(false);

  const close = useCallback(() => {
    void invokePromise(LayoutOperation.UpdateDialog, { state: false });
  }, [invokePromise]);

  const handleConfirm = useCallback(() => {
    if (settled.current) {
      return;
    }
    settled.current = true;
    close();
  }, [close]);

  const handleCancel = useCallback(() => {
    if (settled.current) {
      return;
    }
    settled.current = true;
    Obj.update(magazine, (magazine) => {
      magazine.feeds = magazine.feeds.filter((ref) => ref.target !== feed);
    });
    Obj.getDatabase(feed)?.remove(feed);
    close();
  }, [feed, magazine, close]);

  return (
    <Dialog.Content
      onEscapeKeyDown={handleCancel}
      onInteractOutside={handleCancel}
      onOpenAutoFocus={(event) => event.preventDefault()}
    >
      <Dialog.Header>
        <Dialog.Title>{t('feed-dialog.title')}</Dialog.Title>
      </Dialog.Header>
      <Dialog.Body>
        <Dialog.Description classNames='sr-only'>{t('feed-dialog.description')}</Dialog.Description>
        <ObjectForm object={feed} type={Subscription.Subscription} showTags={false} />
      </Dialog.Body>
      <Dialog.ActionBar>
        <Button onClick={handleCancel}>{t('feed-dialog-cancel.label')}</Button>
        <Button variant='primary' onClick={handleConfirm}>
          {t('feed-dialog-confirm.label')}
        </Button>
      </Dialog.ActionBar>
    </Dialog.Content>
  );
};

FeedDialog.displayName = 'FeedDialog';
