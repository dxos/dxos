//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEventHandler, useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { meta } from '#meta';
import { Blog } from '#types';

export type PostCardProps = {
  post: Blog.Post;
  onClick?: () => void;
};

/**
 * Summary tile for a `Blog.Post`, rendered as a Masonry tile in the publication view.
 * Reactive to the passed ECHO object via {@link useObject} so edits to the title/description/status
 * update the tile without navigating away and back.
 */
export const PostCard = ({ post: postProp, onClick }: PostCardProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [post] = useObject(postProp);
  const title = post.name?.trim() || t('post-card.untitled.label');
  const status = post.status ?? 'draft';
  const icon = Obj.getIcon(post)?.icon ?? 'ph--article--regular';

  // `Card.Root` renders `role='button'` when clickable but provides no keyboard handling itself, so
  // Enter/Space activation is wired up here (mirrors native `<button>` key semantics).
  const handleKeyDown = useCallback<KeyboardEventHandler<HTMLDivElement>>(
    (event) => {
      if (!onClick) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        if (event.key === ' ') {
          event.preventDefault();
        }
        onClick();
      }
    },
    [onClick],
  );

  return (
    <Next.Card.Root
      classNames={onClick && 'dx-hover'}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <Next.Card.Header>
        <Next.Block>
          <Next.Icon icon={icon} />
        </Next.Block>
        <Next.Card.Title lines={2}>{title}</Next.Card.Title>
      </Next.Card.Header>
      <Next.Card.Body>
        {post.description && (
          <Next.Card.Row>
            <Next.Card.Text variant='description' classNames='line-clamp-3'>
              {post.description}
            </Next.Card.Text>
          </Next.Card.Row>
        )}
        <Next.Card.Row>
          <Next.Block>
            <Next.Icon icon={status === 'published' ? 'ph--cloud-check--regular' : 'ph--pencil-simple--regular'} />
          </Next.Block>
          <Next.Card.Text variant='description'>{t(`post-card.status.${status}.label`)}</Next.Card.Text>
        </Next.Card.Row>
      </Next.Card.Body>
    </Next.Card.Root>
  );
};
