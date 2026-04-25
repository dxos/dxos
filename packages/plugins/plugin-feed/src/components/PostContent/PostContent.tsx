//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { ScrollArea } from '@dxos/react-ui';
import { MarkdownViewer } from '@dxos/react-ui-markdown';
import { composable } from '@dxos/ui-theme';

import { Subscription } from '#types';

import { formatDate } from '../../util/format-date';

export type PostContentProps = {
  /** Post to render. */
  post: Subscription.Post;
  /** Additional metadata, such as feed or source domain, rendered between author and published date. */
  metadata?: string[];
};

/**
 * Shared presentational layout for an article-style post: title, meta line,
 * hero image, optional description, and the Markdown body.
 */
export const PostContent = composable<HTMLDivElement, PostContentProps>(
  ({ post, metadata = [], ...props }, forwardedRef) => {
    const meta = [post.author, ...metadata, formatDate(post.published)].filter(Boolean).join(' · ');
    const content = post.content || post.snippet;
    const title = post.title;

    return (
      <ScrollArea.Root {...props} orientation='vertical' thin ref={forwardedRef}>
        <ScrollArea.Viewport classNames='flex flex-col gap-3 p-4'>
          {title && <h1 className='text-xl font-semibold'>{title}</h1>}
          {post.imageUrl?.startsWith('http') && (
            <img src={post.imageUrl} alt='' className='rounded w-full object-cover max-h-72' loading='lazy' />
          )}
          {content && <MarkdownViewer content={content} />}
          {meta && <div className='text-xs text-subdued'>{meta}</div>}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    );
  },
);

PostContent.displayName = 'PostContent';
