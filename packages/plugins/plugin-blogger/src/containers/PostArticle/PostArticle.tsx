//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Type } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { qualifyId } from '@dxos/plugin-graph';
import { Panel } from '@dxos/react-ui';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { ObjectForm } from '@dxos/react-ui-form';

import { Blog } from '#types';

export type PostArticleProps = AppSurface.ObjectArticleProps<Blog.Post>;

// The Post form shows only the name and the inline outline; `content`/`status` are system-managed.
const PostFormSchema = Type.getSchema(Blog.Post).pipe(Schema.pick('name', 'outline'));

/**
 * Article surface for a `Blog.Post`: a schema-driven form of the post's own fields (name, outline) on
 * top, and the single body `Markdown.Document` (rendered via the markdown article Surface) below. The
 * post's `status` and its publisher link are managed by the publication-level `SyncPosts` operation.
 */
export const PostArticle = ({ role, attendableId, subject }: PostArticleProps) => {
  useObject(subject);
  const contentRef = subject.content;
  useObject(contentRef);
  const contentDoc = contentRef?.target;

  // The editor's `attendableId` must be a real graph-node id (path) so `graph.actions(...)` resolves
  // the in-editor toolbar actions (e.g. the comment button). blogger's `postComments` connector
  // contributes a hidden node for the body doc under the Post whose id is `qualifyId(<post node id>,
  // doc.id)`; the Post plank's `attendableId` IS that post node id. The editor's document id (the
  // comment selection key) stays `getURI(doc)` — the markdown surface derives it from `subject`.
  const contentAttendableId = contentDoc
    ? attendableId
      ? qualifyId(attendableId, contentDoc.id)
      : Obj.getURI(contentDoc)
    : undefined;
  const contentData = useMemo(
    () => (contentDoc && contentAttendableId ? { subject: contentDoc, attendableId: contentAttendableId } : undefined),
    [contentDoc, contentAttendableId],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Content>
        <div className='grid h-full grid-rows-[auto_minmax(0,2fr)] gap-3 overflow-hidden'>
          <ObjectForm object={subject} type={Blog.Post} schema={PostFormSchema} />
          {contentData && contentAttendableId ? (
            // The body editor is rendered outside the Deck plank wrapper, so it must supply its own
            // attendable container (matching the editor's `attendableId`) or its toolbar never gains
            // attention and stays inactive. See `AttendableContainer`'s note on non-Deck/Stack usage.
            <AttendableContainer id={contentAttendableId} classNames='dx-container'>
              <Surface.Surface type={AppSurface.Article} data={contentData} limit={1} />
            </AttendableContainer>
          ) : (
            <div className='dx-container' />
          )}
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};

PostArticle.displayName = 'PostArticle';
