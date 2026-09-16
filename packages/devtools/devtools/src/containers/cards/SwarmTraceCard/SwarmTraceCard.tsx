//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import * as Trace from '@dxos/compute/Trace';
import { IconButton } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

import { StatCard } from '../../../components/index.ts';
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
      {!available && <StatCard.Row label='No remote trace monitor (local-only deployment).' />}
      {available && messages.length === 0 && <StatCard.Row label='No announcements received.' />}
      {messages.map((received) => {
        const summary = formatSummary(received);
        const open = expanded === received.id;
        return (
          <React.Fragment key={received.id}>
            <StatCard.Row
              label={summary}
              title={summary}
              action={
                <IconButton
                  iconOnly
                  variant='ghost'
                  icon={open ? 'ph--caret-up--regular' : 'ph--caret-down--regular'}
                  label={open ? 'Collapse' : 'Expand'}
                  onClick={() => setExpanded(open ? undefined : received.id)}
                />
              }
            />
            {open && (
              <StatCard.Content>
                <JsonHighlighter
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
          </React.Fragment>
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
