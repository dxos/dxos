//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Panel, ScrollArea } from '@dxos/react-ui';
import { type Message } from '@dxos/types';

import { AttachmentViewer } from '#components';
import { getAttachmentKind, useBlobUrl } from '#hooks';

export type AttachmentArticleProps = AppSurface.ArticleProps<
  Message.Message,
  {
    /** Which of the message's attachments to show; the first when unspecified. */
    attachmentIndex?: number;
  }
>;

/**
 * Article view for one of a message's attachments. The subject is the MESSAGE, not the blob: an
 * attachment has no identity of its own in the schema (it is an entry in `message.attachments`), so the
 * plank is addressed by message plus index.
 */
export const AttachmentArticle = ({ role, subject, attachmentIndex = 0 }: AttachmentArticleProps) => {
  const db = Obj.getDatabase(subject);
  const attachment = subject.attachments?.[attachmentIndex];
  const { url, type, pending } = useBlobUrl(attachment?.ref, db);

  return (
    <Panel.Root role={role}>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport classNames='h-full'>
            <AttachmentViewer
              url={url}
              // The blob's own MIME type is the only one available: `Message.Attachment` records just
              // name/ref/contentId, so the type comes from where the bytes were stored.
              kind={getAttachmentKind(type)}
              type={type}
              name={attachment?.name}
              pending={pending}
              classNames='h-full'
            />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

AttachmentArticle.displayName = 'AttachmentArticle';
