//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { getSpace } from '@dxos/react-client/echo';
import { type Thread } from '@dxos/types';

import { ThreadArticle } from '#containers';

export type ThreadArticleSurfaceProps = {
  subject: Thread.Thread;
};

/** A thread outside a space has nothing to resolve its messages against, so it renders nothing. */
export const ThreadArticleSurface = ({ subject }: ThreadArticleSurfaceProps) => {
  const space = getSpace(subject);
  if (!space || !subject) {
    return null;
  }

  return <ThreadArticle space={space} thread={subject} />;
};
