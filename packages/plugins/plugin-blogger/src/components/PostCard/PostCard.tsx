//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEventHandler, useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Card, Icon, useTranslation } from '@dxos/react-ui';

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
    <Card.Root
      fullWidth
      classNames={onClick && 'dx-hover'}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <Card.Header>
        <Card.Block>
          <Icon icon={icon} />
        </Card.Block>
        <Card.Title classNames='line-clamp-2'>{title}</Card.Title>
      </Card.Header>
      <Card.Body>
        {post.description && (
          <Card.Row>
            <Card.Text variant='description' classNames='line-clamp-3'>
              {post.description}
            </Card.Text>
          </Card.Row>
        )}
        <Card.Row>
          <Card.Block>
            <Icon icon={status === 'published' ? 'ph--cloud-check--regular' : 'ph--pencil-simple--regular'} />
          </Card.Block>
          <Card.Text variant='description'>{t(`post-card.status.${status}.label`)}</Card.Text>
        </Card.Row>
      </Card.Body>
    </Card.Root>
  );
};
