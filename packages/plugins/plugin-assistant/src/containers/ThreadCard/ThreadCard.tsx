//
// Copyright 2026 DXOS.org
//

import React from 'react';

import {
  ThreadCard as NaturalThreadCard,
  type ThreadCardProps as NaturalThreadCardProps,
} from '@dxos/react-ui-assistant';

export type ThreadCardProps = NaturalThreadCardProps;

/** The default {@link AssistantSurface.ThreadCard} surface. */
export const ThreadCard = (props: ThreadCardProps) => <NaturalThreadCard {...props} />;

ThreadCard.displayName = 'ThreadCard';

export default ThreadCard;
