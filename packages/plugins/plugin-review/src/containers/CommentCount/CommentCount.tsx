//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { type Obj } from '@dxos/echo';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';

import { ReviewNamespace } from '../../namespace.ts';
import { findCommentConfig } from '../../util/index.ts';
import { useCommentAnchors } from '../CommentsArticle/CommentThreadList.tsx';

export type CommentCountProps = {
  subject: Obj.Unknown;
};

/** A card's count of its subject's unresolved threads; nothing when it has none or takes no comments. */
export const CommentCount = ({ subject }: CommentCountProps) => {
  const configs = Hooks.useCapabilities(AppCapabilities.CommentConfig);
  return findCommentConfig(configs, subject) ? <UnresolvedCount subject={subject} /> : null;
};

CommentCount.displayName = 'CommentCount';

const UnresolvedCount = ({ subject }: CommentCountProps) => {
  const { t } = UiHooks.useTranslation(ReviewNamespace.key);
  const count = useCommentAnchors(subject, { showResolvedThreads: false }).length;
  if (count === 0) {
    return null;
  }

  const label = t('comment-count.label', { count });
  return (
    <span
      title={label}
      className='flex items-center gap-1 pe-2 text-sm text-description'
      data-testid='comments.card-count'
    >
      <Icon.Icon icon='ph--chat-text--regular' label={label} />
      {count}
    </span>
  );
};
