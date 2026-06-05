//
// Copyright 2026 DXOS.org
//

import { Atom, RegistryContext } from '@effect-atom/atom-react';
import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { getParentId, isLinkedSegment } from '@dxos/react-ui-attention';

import { PostContent } from '#components';
import { meta } from '#meta';
import { FeedOperation } from '#types';
import { Subscription } from '#types';

import { setReadAt, setTag, usePostContentAtom } from '../../state';
import { PostToolbar } from './PostToolbar';

export type PostArticleProps = AppSurface.ObjectArticleProps<Subscription.Post>;

export const PostArticle = ({ role, subject, attendableId }: PostArticleProps) => {
  // When shown as a companion the `attendableId` is a linked segment, but attention lives on the
  // parent plank — resolve to the parent so the toolbar reads as attended (active).
  const toolbarAttendableId =
    attendableId && isLinkedSegment(attendableId) ? getParentId(attendableId) : attendableId;
  const { invokePromise } = useOperationInvoker();
  const registry = useContext(RegistryContext);
  const [post] = useObject(subject);
  const db = Obj.getDatabase(post);
  const subscription = post.source?.target;
  const { id } = post;
  const postContent = usePostContentAtom(subject);

  // Lazily fetch full article content the first time this Post is shown — covers
  // entry points that bypass MagazineArticle's `handleOpen` (deep-link, agent surface,
  // restored attention). LoadPostContent is idempotent (no-op if `content` already
  // populated or `link` missing), so a unique guard per Post id is enough to keep us
  // from re-firing on every render.
  const requestedContentFor = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (requestedContentFor.current === id) {
      return;
    }
    if (!post.link || postContent) {
      return;
    }
    requestedContentFor.current = id;
    void invokePromise(FeedOperation.LoadPostContent, { post: Ref.make(subject) }).catch((err) =>
      log.catch(err, { postLink: post.link }),
    );
  }, [subject, post, post.link, postContent, invokePromise, id]);

  // Reactive lookup of the source feed name. `post.feed?.target?.name` only renders
  // synchronously when the ref is already resolved; querying feeds via useQuery means
  // the meta line updates as soon as the feed object is loaded into the space.
  const allFeeds = useQuery(db, Filter.type(Subscription.Subscription));
  const feedName = useMemo(() => {
    const dxn = post.source?.uri;
    if (!dxn) {
      return undefined;
    }
    return allFeeds.find((feed) => Obj.getURI(feed) === dxn)?.name;
  }, [post.source, allFeeds]);

  const handleOpenOriginal = useCallback(() => {
    if (post.link) {
      window.open(post.link, '_blank', 'noopener,noreferrer');
    }
  }, [post.link]);

  const handleMarkUnread = useCallback(() => {
    if (subscription) {
      setReadAt(subscription, id, undefined);
    }
  }, [subscription, id]);

  // Value-setters (not toggles): the toolbar reads the current star/archive state reactively via
  // `get` and passes the desired next value, so these don't need to subscribe to the current state.
  const handleSetArchived = useCallback(
    (value: boolean) => {
      if (db && subscription) {
        void setTag(subscription, id, db, 'archived', value);
      }
    },
    [db, subscription, id],
  );

  const handleSetStarred = useCallback(
    (value: boolean) => {
      if (db && subscription) {
        void setTag(subscription, id, db, 'starred', value);
      }
    },
    [db, subscription, id],
  );

  // Re-fetch the article body from the source via the LoadPostContent operation with `force`, so the
  // fetch/extraction/storage logic lives in one place (the operation) rather than inline here. Appends
  // a fresh content entry to the subscription's contentFeed; the reverse-ref lookup picks the newest.
  // `refreshing` is an atom so the toolbar subscribes to it via `get` rather than via React deps.
  const refreshingAtom = useMemo(() => Atom.make(false), []);
  const handleRefresh = useCallback(async () => {
    if (!post.link || registry.get(refreshingAtom)) {
      return;
    }
    registry.set(refreshingAtom, true);
    try {
      // Failures surface as a toast via `notify`; invokePromise resolves with `{ error }`, never throws.
      await invokePromise(
        FeedOperation.LoadPostContent,
        { post: Ref.make(subject), force: true },
        { notify: { error: ['refresh-content-error.message', { ns: meta.id }] } },
      );
    } finally {
      registry.set(refreshingAtom, false);
    }
  }, [registry, refreshingAtom, subject, post.link, invokePromise]);

  return (
    <Panel.Root role={role}>
      <PostToolbar
        post={subject}
        refreshingAtom={refreshingAtom}
        attendableId={toolbarAttendableId}
        onSetStarred={handleSetStarred}
        onSetArchived={handleSetArchived}
        onMarkUnread={handleMarkUnread}
        onRefresh={() => void handleRefresh()}
        onOpenOriginal={handleOpenOriginal}
      />
      <Panel.Content asChild>
        <PostContent post={subject} metadata={feedName ? [feedName] : undefined} />
      </Panel.Content>
    </Panel.Root>
  );
};
