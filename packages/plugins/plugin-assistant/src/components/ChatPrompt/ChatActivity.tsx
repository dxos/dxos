//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type RequestPhase, type RequestPhaseName } from '@dxos/assistant';
import type * as Trace from '@dxos/compute/Trace';
import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { ChatStatus as NaturalChatStatus } from '@dxos/react-ui-chat';

import { meta } from '#meta';

const CHAT_ACTIVITY_NAME = 'Chat.Activity';

const activityLabelKey = (phase: RequestPhaseName): string => `activity.${phase}.label`;

export type ChatActivityProps = ThemedClassName<{
  activity?: Trace.PayloadType<typeof RequestPhase>;
}>;

/**
 * What the request is doing while the reader waits for the first token, given a resolved phase.
 *
 * The gap before a reply is dominated by setup the reader cannot see — a cold MCP server, a
 * summarization pass, a request the provider is making us re-issue — so the agent reports each stage
 * as it enters it and this renders the latest one. It renders nothing once content streams in: the
 * reply is the better progress report, and a label left underneath it would only compete with it.
 *
 * The phase arrives as a prop rather than being read from the chat context, so every phase can be
 * mounted in a story without a live agent process; `Chat.Activity` is the bound form.
 */
export const ChatActivity = ({ classNames, activity }: ChatActivityProps) => {
  const { t } = useTranslation(meta.profile.key);
  if (!activity) {
    return null;
  }

  return (
    // `font-body` overrides the pill root's `font-mono`, which suits the status pill's token counts
    // and elapsed clock but renders a sentence as debug output.
    <NaturalChatStatus.Root defaultRunning={false} classNames={['py-1 gap-2 text-sm font-body', classNames]}>
      <NaturalChatStatus.Icon />
      <NaturalChatStatus.Text>
        <span data-testid='assistant.chat-activity'>{t(activityLabelKey(activity.phase))}</span>
      </NaturalChatStatus.Text>
      {/* Only a re-issued request has an attempt worth naming; the first one is just the request. */}
      {activity.attempt != null && activity.attempt > 1 && (
        <>
          <NaturalChatStatus.Separator />
          <NaturalChatStatus.Text>
            <span data-testid='assistant.chat-activity.attempt'>
              {t('activity.attempt', { attempt: activity.attempt })}
            </span>
          </NaturalChatStatus.Text>
        </>
      )}
      {activity.detail && (
        <>
          <NaturalChatStatus.Separator />
          <NaturalChatStatus.Text>{activity.detail}</NaturalChatStatus.Text>
        </>
      )}
    </NaturalChatStatus.Root>
  );
};

ChatActivity.displayName = CHAT_ACTIVITY_NAME;
