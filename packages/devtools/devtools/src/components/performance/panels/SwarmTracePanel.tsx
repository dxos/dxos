//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Stream from 'effect/Stream';
import React, { useEffect, useRef, useState } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import { useOptionalCapability } from '@dxos/app-framework/ui';
import * as Trace from '@dxos/compute/Trace';
import { useSpaces } from '@dxos/react-client/echo';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { Accordion } from '@dxos/react-ui-list';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

import { type CustomPanelProps, Panel } from '../Panel';

/** Cap on retained broadcasts so a long-lived session does not grow the list unbounded. */
const MAX_MESSAGES = 200;

/** One received swarm broadcast, annotated with local receipt metadata. */
type ReceivedMessage = {
  readonly id: string;
  readonly receivedAt: number;
  readonly message: Trace.Message;
};

/**
 * Raw view of every ephemeral trace message remote runtimes announce over the space swarm (DX-1125),
 * subscribed per space because an empty {@link Trace.Filter} derives no swarm tag.
 */
export const SwarmTracePanel = (props: CustomPanelProps<{}>) => {
  const monitor = useOptionalCapability(Capabilities.RemoteTraceMonitor);
  const runtime = useOptionalCapability(Capabilities.ProcessManagerRuntime);
  const spaces = useSpaces();
  const [messages, setMessages] = useState<ReceivedMessage[]>([]);
  const seqRef = useRef(0);

  const spaceIds = spaces.map((space) => space.id).join(',');
  useEffect(() => {
    if (!monitor || !runtime || spaceIds.length === 0) {
      return;
    }

    const fibers = spaceIds.split(',').map((space) =>
      runtime.runFork(
        monitor.subscribeToTraceMessages({ space }).pipe(
          // Stamp receipt before batching — `groupedWithin` can hold a batch for up to 250ms, so a
          // post-batch timestamp would misdate every message in it.
          Stream.map((message) => ({ message, receivedAt: Date.now() })),
          // Bulk sync announcements arrive ~15/s; batch so render cost is per-window, not per-message.
          Stream.groupedWithin(64, '250 millis'),
          Stream.runForEach((batch) =>
            Effect.sync(() => {
              const incoming = batch.map(({ message, receivedAt }) => ({
                message,
                receivedAt,
                id: String(seqRef.current++),
              }));
              setMessages((prev) => [...prev, ...incoming].slice(-MAX_MESSAGES));
            }),
          ),
        ),
      ),
    );

    return () => {
      for (const fiber of fibers) {
        runtime.runFork(Fiber.interrupt(fiber));
      }
    };
  }, [monitor, runtime, spaceIds]);

  return (
    <Panel
      {...props}
      icon='ph--broadcast--regular'
      title='Swarm announcements'
      info={<span>{messages.length}</span>}
      maxHeight={0}
    >
      <Toolbar.Root>
        <IconButton
          icon='ph--trash--regular'
          label='clear'
          disabled={messages.length === 0}
          onClick={() => setMessages([])}
        />
        <Toolbar.Separator />
        <Toolbar.Text>{spaces.length} space(s)</Toolbar.Text>
      </Toolbar.Root>
      {!monitor ? (
        <Toolbar.Text>No remote trace monitor (local-only deployment).</Toolbar.Text>
      ) : messages.length === 0 ? (
        <Toolbar.Text>No announcements received.</Toolbar.Text>
      ) : (
        // Collapsed by default so a burst does not mount hundreds of costly payload renders.
        <Accordion.Root items={messages}>
          {({ items }) =>
            items.map((received) => (
              <Accordion.Item key={received.id} item={received}>
                <Accordion.ItemHeader hover>{formatSummary(received)}</Accordion.ItemHeader>
                <Accordion.ItemBody>
                  <JsonHighlighter
                    data={{
                      receivedAt: new Date(received.receivedAt).toISOString(),
                      // The wire tag list this broadcast was routed under — what a subscriber's
                      // coarse swarm subscription matches against.
                      tags: Trace.messageToTags(received.message),
                      meta: received.message.meta,
                      events: received.message.events,
                    }}
                  />
                </Accordion.ItemBody>
              </Accordion.Item>
            ))
          }
        </Accordion.Root>
      )}
    </Panel>
  );
};

/** One-line row: emit time (falling back to receipt), payload event types, and origin space. */
const formatSummary = (received: ReceivedMessage): string => {
  const types = received.message.events.map((event) => event.type).join(', ');
  const emittedAt = received.message.events[0]?.timestamp ?? received.receivedAt;
  return [formatTime(emittedAt), types, received.message.meta.space].filter(Boolean).join(' · ');
};

const formatTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString(undefined, { hour12: false }) +
  `.${String(timestamp % 1000).padStart(3, '0')}`;
