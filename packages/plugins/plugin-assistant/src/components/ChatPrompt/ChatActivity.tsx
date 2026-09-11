//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { type RequestPhase, type RequestPhaseName } from '@dxos/assistant';
import type * as Trace from '@dxos/compute/Trace';
import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { ChatStatus as NaturalChatStatus } from '@dxos/react-ui-chat';

import { meta } from '#meta';

const CHAT_ACTIVITY_NAME = 'Chat.Activity';

const activityLabelKey = (phase: RequestPhaseName): string => `activity.${phase}.label`;

/**
 * Phases whose `detail` reads as part of the sentence ("Calling tool search") rather than as a
 * separate field, so the label interpolates it and the detail chip is suppressed.
 */
const INLINE_DETAIL_PHASES: ReadonlySet<RequestPhaseName> = new Set<RequestPhaseName>(['calling-tool']);

export type ChatActivityProps = ThemedClassName<{
  activity?: Trace.PayloadType<typeof RequestPhase>;
  /**
   * Epoch milliseconds the agent is scheduled to wake at, when an alarm is pending. Rendered as a
   * counting-down line while the agent is otherwise idle; a live phase supersedes it, since a
   * running turn is the more immediate answer to "what is it doing".
   */
  wakeAt?: number;
}>;

/**
 * What the agent is doing, given a resolved phase or a pending alarm.
 *
 * The line stays up for as long as there is something to report: the setup stages before the first
 * token (a cold MCP server, a summarization pass, a re-issued request), the generation, each tool
 * call, and — once the turn settles with an alarm pending — the wait until the agent wakes itself.
 * Only a fully idle agent renders nothing.
 *
 * The phase and the wake time arrive as props rather than being read from the chat context, so every
 * state can be mounted in a story without a live agent process; `Chat.Activity` is the bound form.
 */
export const ChatActivity = ({ classNames, activity, wakeAt }: ChatActivityProps) => {
  const { t } = useTranslation(meta.profile.key);
  const remaining = useCountdown(activity ? undefined : wakeAt);
  const label = activity
    ? t(activityLabelKey(activity.phase), { detail: activity.detail ?? '' })
    : remaining !== undefined
      ? formatWaking(t, remaining)
      : undefined;
  if (!label) {
    return null;
  }

  return (
    // `font-body` overrides the pill root's `font-mono`, which suits the status pill's token counts
    // and elapsed clock but renders a sentence as debug output.
    <NaturalChatStatus.Root defaultRunning={false} classNames={['py-1 px-2 gap-2 text-sm font-body', classNames]}>
      <NaturalChatStatus.Icon />
      <NaturalChatStatus.Text>
        <span data-testid='assistant.chat-activity'>{label}</span>
      </NaturalChatStatus.Text>
      {/* Only a re-issued request has an attempt worth naming; the first one is just the request. */}
      {activity?.attempt != null && activity.attempt > 1 && (
        <>
          <NaturalChatStatus.Separator />
          <NaturalChatStatus.Text>
            <span data-testid='assistant.chat-activity.attempt'>
              {t('activity.attempt', { attempt: activity.attempt })}
            </span>
          </NaturalChatStatus.Text>
        </>
      )}
      {activity?.detail && !INLINE_DETAIL_PHASES.has(activity.phase) && (
        <>
          <NaturalChatStatus.Separator />
          <NaturalChatStatus.Text>{activity.detail}</NaturalChatStatus.Text>
        </>
      )}
    </NaturalChatStatus.Root>
  );
};

ChatActivity.displayName = CHAT_ACTIVITY_NAME;

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

/**
 * Milliseconds until `wakeAt`, re-evaluated every second, or `undefined` when nothing is scheduled.
 *
 * The alarm is a fixed instant rather than a stream of events, so the countdown is the client's to
 * run; ticking on a plain interval keeps it a rendering concern and leaves the agent silent while
 * it sleeps.
 */
const useCountdown = (wakeAt?: number): number | undefined => {
  const [remaining, setRemaining] = useState(() => (wakeAt === undefined ? undefined : wakeAt - Date.now()));
  useEffect(() => {
    if (wakeAt === undefined) {
      setRemaining(undefined);
      return;
    }

    setRemaining(wakeAt - Date.now());
    const interval = setInterval(() => setRemaining(wakeAt - Date.now()), SECOND);
    return () => clearInterval(interval);
  }, [wakeAt]);

  return remaining;
};

/**
 * The countdown line, at the coarsest unit that still carries information: a wake an hour out does
 * not become more legible counted in seconds.
 */
const formatWaking = (t: (key: string, options?: Record<string, unknown>) => string, remaining: number): string => {
  if (remaining < SECOND) {
    return t('activity.waking.now.label');
  }
  if (remaining < MINUTE) {
    return t('activity.waking.seconds.label', { count: Math.round(remaining / SECOND) });
  }
  if (remaining < HOUR) {
    return t('activity.waking.minutes.label', { count: Math.round(remaining / MINUTE) });
  }
  return t('activity.waking.hours.label', { count: Math.round(remaining / HOUR) });
};
