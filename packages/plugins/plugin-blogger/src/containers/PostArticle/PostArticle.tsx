//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { qualifyId } from '@dxos/plugin-graph';

import { Blog } from '#types';

export type PostArticleProps = AppSurface.ObjectArticleProps<Blog.Post>;

/**
 * Article surface for a `Blog.Post`: a schema-driven form of the post's own fields (name, outline) on
 * top, and the single body `Markdown.Document` (rendered via the markdown article Surface) below.
 * The post's `status` and its publisher link are managed by the publication-level `SyncPosts` operation.
 */
export const PostArticle = ({ role, attendableId, subject }: PostArticleProps) => {
  // Resolve the body doc reactively (cold refs load in). The post's `content` ref itself is set once
  // at creation and never swapped, so subscribing to the post adds nothing.
  const contentRef = subject.content;
  useObject(contentRef);

  // The editor's `attendableId` must be a real graph-node id (path) so `graph.actions(...)` resolves
  // the in-editor toolbar actions (e.g. the comment button). blogger's `postComments` connector
  // contributes a hidden node for the body doc under the Post whose id is `qualifyId(<post node id>,
  // doc.id)`; the Post plank's `attendableId` IS that post node id. The editor's document id (the
  // comment selection key) stays `getURI(doc)` — the markdown surface derives it from `subject`.
  const contentDoc = contentRef?.target;
  const contentAttendableId = contentDoc
    ? attendableId
      ? qualifyId(attendableId, contentDoc.id)
      : Obj.getURI(contentDoc)
    : undefined;
  const contentData = useMemo(
    () => (contentDoc && contentAttendableId ? { subject: contentDoc, attendableId: contentAttendableId } : undefined),
    [contentDoc, contentAttendableId],
  );

  if (!contentData || !contentAttendableId) {
    return null;
  }

  return <Surface.Surface role={role} type={AppSurface.Article} data={contentData} limit={1} />;
};

PostArticle.displayName = 'PostArticle';
