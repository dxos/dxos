//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Listbox } from '@dxos/react-ui-list';
import * as Banner from '@dxos/react-ui/Banner';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';

import { AssistantNamespace } from '../../namespace.ts';

export type Attachment = { id: number; name: string; error?: Error };

/** A file that stores within this long is never listed as attaching, so a quick upload does not flash a banner. */
const PENDING_DELAY = 400;

export type ChatAttachmentsProps = {
  pending: readonly Attachment[];
  failed: readonly Attachment[];
  onCancel: () => void;
  onDismiss: () => void;
};

export const ChatAttachments = ({ pending, failed, onCancel, onDismiss }: ChatAttachmentsProps) => {
  const { t } = Hooks.useTranslation(AssistantNamespace.key);
  const attaching = pending.length > 0;
  const [showPending, setShowPending] = useState(false);
  useEffect(() => {
    if (!attaching) {
      setShowPending(false);
      return;
    }
    const timeout = setTimeout(() => setShowPending(true), PENDING_DELAY);
    return () => clearTimeout(timeout);
  }, [attaching]);

  return (
    <>
      {attaching && showPending && (
        <Banner.Root valence='neutral' data-testid='assistant.attachments.pending'>
          <Banner.Title>{t('attachments-pending.label')}</Banner.Title>
          <Banner.Body>
            <AttachmentList label={t('attachments-pending.label')} attachments={pending} />
            <Button.Root
              variant='ghost'
              label={t('attachments-cancel.label')}
              onClick={onCancel}
              data-testid='assistant.attachments.cancel'
            />
          </Banner.Body>
        </Banner.Root>
      )}
      {failed.length > 0 && (
        <Banner.Root valence='error' data-testid='assistant.attachments.failed'>
          <Banner.Title onClose={onDismiss}>{t('attachments-failed.label')}</Banner.Title>
          <Banner.Body>
            <AttachmentList label={t('attachments-failed.label')} attachments={failed} />
          </Banner.Body>
        </Banner.Root>
      )}
    </>
  );
};

const AttachmentList = ({ label, attachments }: { label: string; attachments: readonly Attachment[] }) => (
  <Listbox.Root items={attachments.map(({ id, name }) => ({ value: String(id), label: name }))}>
    <Listbox.Viewport>
      <Listbox.Content aria-label={label} classNames='gap-0.5 text-sm'>
        {attachments.map(({ id, name, error }) => (
          <Listbox.Item key={id} id={String(id)}>
            {/* `min-w-0`: the item is a flex child, so without it `truncate` never shrinks below the content's width. */}
            <span className='truncate min-w-0'>
              <span className='font-mono'>{name}</span>
              {error && ` - ${error.message}`}
            </span>
          </Listbox.Item>
        ))}
      </Listbox.Content>
    </Listbox.Viewport>
  </Listbox.Root>
);
