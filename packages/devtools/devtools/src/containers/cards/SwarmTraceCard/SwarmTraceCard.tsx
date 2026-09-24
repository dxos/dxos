//
// Copyright 2026 DXOS.org
//

import React, { Fragment, useState } from 'react';

import * as Trace from '@dxos/compute/Trace';
import { IconButton } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

import { STAT_CARD_HUES, StatCard } from '../../../components/index.ts';
import { type ReceivedMessage } from '../../../hooks/index.ts';

export type SwarmTraceCardProps = {
  messages?: ReceivedMessage[];
  spaceCount?: number;
  /** `false` when no remote trace monitor is contributed (a local-only deployment). */
  available?: boolean;
  onClear?: () => void;
};

/** Raw view of every ephemeral trace message remote runtimes announce over the space swarm (DX-1125). */
export const SwarmTraceCard = ({ messages = [], spaceCount = 0, available = true, onClear }: SwarmTraceCardProps) => {
  const [expanded, setExpanded] = useState<string>();
  return (
    <StatCard.Root>
      <StatCard.Header
        icon='ph--broadcast--regular'
        hue={STAT_CARD_HUES.edge}
        title='Swarm announcements'
        info={`${messages.length} · ${spaceCount} spaces`}
        action={
          onClear && (
            <IconButton
              iconOnly
              variant='ghost'
              icon='ph--trash--regular'
              label='Clear'
              disabled={messages.length === 0}
              onClick={onClear}
            />
          )
        }
      />
      {!available && <StatCard.Row span label='No remote trace monitor (local-only deployment).' />}
      {available && messages.length === 0 && <StatCard.Row span label='No announcements received.' />}
      {messages.map((received) => {
        const summary = formatSummary(received);
        const open = expanded === received.id;
        return (
          <Fragment key={received.id}>
            <StatCard.Row
              label={summary}
              tooltip={summary}
              open={open}
              onToggle={(open) => setExpanded(open ? received.id : undefined)}
            />
            {open && (
              <StatCard.Content>
                <JsonHighlighter
                  classNames='text-xs'
                  data={{
                    receivedAt: new Date(received.receivedAt).toISOString(),
                    // The wire tag list this broadcast was routed under — what a subscriber's coarse
                    // swarm subscription matches against.
                    tags: Trace.messageToTags(received.message),
                    meta: received.message.meta,
                    events: received.message.events,
                  }}
                />
              </StatCard.Content>
            )}
          </Fragment>
        );
      })}
    </StatCard.Root>
  );
};

SwarmTraceCard.displayName = 'SwarmTraceCard';

/** One-line row: emit time (falling back to receipt), payload event types, and origin space. */
const formatSummary = (received: ReceivedMessage): string => {
  const types = received.message.events.map((event) => event.type).join(', ');
  const emittedAt = received.message.events[0]?.timestamp ?? received.receivedAt;
  return [formatTime(emittedAt), types, received.message.meta.space].filter(Boolean).join(' · ');
};

const formatTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString(undefined, { hour12: false }) +
  `.${String(timestamp % 1000).padStart(3, '0')}`;
