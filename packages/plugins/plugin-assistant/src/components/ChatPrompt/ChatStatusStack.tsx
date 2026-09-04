//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { ChatActivity, ChatActivityView, type ChatActivityViewProps } from './ChatActivity';
import { ChatStatus, ChatStatusView, type ChatStatusViewProps } from './ChatStatus';

const CHAT_STATUS_STACK_NAME = 'Chat.StatusStack';

export type ChatStatusStackProps = ThemedClassName<{
  /** Applied to each row, so the host can give both lines the same text column. */
  rowClassNames?: string;
  /** Applied to the counters pill only, which is the row that carries a surface. */
  pillClassNames?: string;
}>;

/**
 * The activity line stacked on top of the counters pill.
 *
 * Ordering is the whole point of the component: the activity line names what the request is doing
 * and the pill reports what it has cost so far, so the sentence reads as a caption above the
 * numbers rather than an afterthought below them. Composed here rather than in the container so the
 * order is asserted and screenshotted in one story ({@link ChatStatusStackView}).
 */
export const ChatStatusStack = ({ classNames, rowClassNames, pillClassNames }: ChatStatusStackProps) => (
  <div className={mx('flex flex-col', classNames)}>
    <div className={rowClassNames}>
      <ChatActivity />
    </div>
    <div className={rowClassNames}>
      <ChatStatus classNames={pillClassNames} />
    </div>
  </div>
);

ChatStatusStack.displayName = CHAT_STATUS_STACK_NAME;

export type ChatStatusStackViewProps = ChatStatusStackProps &
  ChatStatusViewProps &
  Pick<ChatActivityViewProps, 'activity'>;

/**
 * The stack given resolved values. Split from {@link ChatStatusStack} so both rows can be mounted
 * with fixed values — neither needs a live processor to prove which one is on top.
 */
export const ChatStatusStackView = ({
  classNames,
  rowClassNames,
  pillClassNames,
  activity,
  ...statusProps
}: ChatStatusStackViewProps) => (
  <div className={mx('flex flex-col', classNames)}>
    <div className={rowClassNames}>
      <ChatActivityView activity={activity} />
    </div>
    <div className={rowClassNames}>
      <ChatStatusView {...statusProps} classNames={pillClassNames} />
    </div>
  </div>
);
