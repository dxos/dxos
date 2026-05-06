//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Card } from '@dxos/react-ui';

import { Subscription } from '#types';

import { formatDate } from '../../util/format-date';

export type PostCardProps = AppSurface.ObjectCardProps<Subscription.Post>;

/**
 * Compact preview of a {@link Subscription.Post}. Rendered into the
 * `AppSurface.Card` slot — Card.Root is supplied by the surface host
 * (popovers, sections, related-objects), so the body emits Card.Content only.
 */
export const PostCard = ({ subject }: PostCardProps) => {
  // Re-render on in-place mutations (readAt, archived, content fetched lazily, …).
  const [post] = useObject(subject);

  // Resolve the source feed's display name when present. `post.feed?.target?.name` only
  // resolves synchronously when the ref is already loaded; querying via useQuery means
  // the meta line lights up as soon as the feed lands in the space.
  const db = Obj.getDatabase(post);
  const allFeeds = useQuery(db, Filter.type(Subscription.Feed));
  const feedName = useMemo(() => {
    const dxn = post.feed?.dxn.toString();
    if (!dxn) {
      return undefined;
    }
    return allFeeds.find((feed) => Obj.getDXN(feed).toString() === dxn)?.name;
  }, [post.feed, allFeeds]);

  const published = formatDate(post.published);

  return (
    <Card.Content>
      {post.imageUrl && (
        <Card.Poster alt={post.title ?? ''} image={post.imageUrl} fit='cover' classNames='rounded-t-xs' />
      )}
      {post.title && (
        <Card.Row>
          <Card.Heading classNames='line-clamp-2'>{post.title}</Card.Heading>
        </Card.Row>
      )}
      {post.snippet && (
        <Card.Row>
          <Card.Text variant='description' classNames='line-clamp-3'>
            {post.snippet}
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
    </Card.Content>
  );
};
