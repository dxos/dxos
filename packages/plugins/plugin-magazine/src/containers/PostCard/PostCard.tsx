//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { Grid, Next } from '@dxos/react-ui';

import { Subscription } from '#types';

import { formatDate, getImageUrl, getSnippet } from '../../util/index.ts';

export type PostCardProps = AppSurface.ObjectCardProps<Subscription.Post>;

/**
 * Compact preview of a {@link Subscription.Post}. Rendered into the
 * `AppSurface.CardContent` slot — Card.Root is supplied by the surface host
 * (popovers, sections, related-objects), so the body emits Card.Body only.
 */
export const PostCard = ({ subject }: PostCardProps) => {
  const [post] = useObject(subject);

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
  // snippet/imageUrl are derived from the Post's description (no content-feed entry in this surface).
  const imageUrl = getImageUrl(post);
  const snippet = useMemo(() => getSnippet(post) || undefined, [post.description]);

  return (
    <Next.Card.Body>
      {imageUrl && <Next.Card.Poster alt={post.title ?? ''} src={imageUrl} fit='cover' classNames='rounded-t-xs' />}
      {post.title && (
        <Next.Card.Row>
          <Next.Card.Title lines={2}>{post.title}</Next.Card.Title>
        </Next.Card.Row>
      )}
      {snippet && (
        <Next.Card.Row>
          <Next.Card.Text variant='description' classNames='line-clamp-3'>
            {snippet}
          </Next.Card.Text>
        </Next.Card.Row>
      )}
      {(feedName || published) && (
        <Next.Card.Row>
          <Grid
            cols={['minmax(0, 1fr)', 'auto']}
            grow={false}
            gap='sm'
            align='center'
            classNames='text-sm text-description overflow-hidden'
          >
            <span className='truncate'>{feedName ?? ''}</span>
            <span className='text-end shrink-0'>{published ?? ''}</span>
          </Grid>
        </Next.Card.Row>
      )}
      {post.link && <Next.Card.Link label={post.link} href={post.link} />}
    </Next.Card.Body>
  );
};

PostCard.displayName = 'PostCard';
