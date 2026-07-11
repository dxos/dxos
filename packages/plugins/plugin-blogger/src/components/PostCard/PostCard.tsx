//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Card, Icon, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { Blogger } from '#types';

export type PostCardProps = {
  post: Blogger.Post;
  onClick?: () => void;
};

/**
 * Summary tile for a `Blogger.Post`, rendered as a Masonry tile in the publication view.
 * Reactive to the passed ECHO object via {@link useObject} so edits to the title/summary/drafts
 * update the tile without navigating away and back.
 */
export const PostCard = ({ post: postProp, onClick }: PostCardProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [post] = useObject(postProp);
  const title = post.name?.trim() || t('post-card.untitled.label');
  const draftCount = post.drafts?.length ?? 0;
  const icon = Obj.getIcon(post)?.icon ?? 'ph--article--regular';

  return (
    <Card.Root fullWidth classNames={onClick && 'dx-hover'} onClick={onClick}>
      <Card.Header>
        <Card.Block>
          <Icon icon={icon} />
        </Card.Block>
        <Card.Title classNames='line-clamp-2'>{title}</Card.Title>
      </Card.Header>
      <Card.Body>
        {post.summary && (
          <Card.Row>
            <Card.Text variant='description' classNames='line-clamp-3'>
              {post.summary}
            </Card.Text>
          </Card.Row>
        )}
        <Card.Row>
          <Card.Block>
            <Icon icon='ph--stack--regular' />
          </Card.Block>
          <Card.Text variant='description'>{t('post-card.drafts.label', { count: draftCount })}</Card.Text>
        </Card.Row>
      </Card.Body>
    </Card.Root>
  );
};
