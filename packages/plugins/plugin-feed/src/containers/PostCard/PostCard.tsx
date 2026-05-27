//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Card } from '@dxos/react-ui';

import { Subscription } from '#types';

import { makeSnippet, stripHtml } from '../../util/extract';
import { formatDate } from '../../util/format-date';
import { getSubscriptionPostState } from '../../util/post-state';

export type PostCardProps = AppSurface.ObjectCardProps<Subscription.Post>;

/**
 * Compact preview of a {@link Subscription.Post}. Rendered into the
 * `AppSurface.Card` slot — Card.Root is supplied by the surface host
 * (popovers, sections, related-objects), so the body emits Card.Body only.
 */
export const PostCard = ({ subject }: PostCardProps) => {
  const [post] = useObject(subject);
  // Subscribe to the source subscription for per-Post user state (imageUrl)
  // and reactive re-render when LoadPostContent populates the hero image.
  const subscription = post.source?.target;
  useObject(subscription);
  const postId = (post as { id: string }).id;
  const userState = getSubscriptionPostState(subscription, postId);

  // Resolve the source feed's display name when present. `post.feed?.target?.name` only
  // resolves synchronously when the ref is already loaded; querying via useQuery means
  // the meta line lights up as soon as the feed lands in the space.
  const db = Obj.getDatabase(post);
  const allFeeds = useQuery(db, Filter.type(Subscription.Subscription));
  const feedName = useMemo(() => {
    const dxn = post.source?.uri;
    if (!dxn) {
      return undefined;
    }
    return allFeeds.find((feed) => Obj.getURI(feed) === dxn)?.name;
  }, [post.source, allFeeds]);

  const published = formatDate(post.published);
  const imageUrl = userState.imageUrl;
  // PostCard is rendered outside a magazine context, so we can't read a
  // curated snippet. Derive one from `post.description` on the fly — same
  // algorithm curate-magazine uses, just inline.
  const snippet = useMemo(() => {
    if (!post.description) {
      return undefined;
    }
    const text = stripHtml(post.description);
    return text ? makeSnippet(text) : undefined;
  }, [post.description]);

  return (
    <Card.Body>
      {imageUrl && <Card.Poster alt={post.title ?? ''} image={imageUrl} fit='cover' classNames='rounded-t-xs' />}
      {post.title && (
        <Card.Row>
          <Card.Title classNames='line-clamp-2'>{post.title}</Card.Title>
        </Card.Row>
      )}
      {snippet && (
        <Card.Row>
          <Card.Text variant='description' classNames='line-clamp-3'>
            {snippet}
          </Card.Text>
        </Card.Row>
      )}
      {(feedName || published) && (
        <Card.Row>
          <div className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-sm text-description overflow-hidden'>
            <span className='truncate'>{feedName ?? ''}</span>
            <span className='text-end shrink-0'>{published ?? ''}</span>
          </div>
        </Card.Row>
      )}
      {post.link && <Card.Link label={post.link} href={post.link} />}
    </Card.Body>
  );
};
