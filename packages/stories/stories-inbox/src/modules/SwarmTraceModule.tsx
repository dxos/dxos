//
// Copyright 2026 DXOS.org
//

import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Stream from 'effect/Stream';
import React, { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useOptionalCapability } from '@dxos/app-framework/ui';
import { Trace } from '@dxos/compute';
import { Panel, Toolbar } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { type ModuleProps } from '@dxos/story-modules';

/** Cap on retained events so a long-running story does not grow the list unbounded. */
const MAX_EVENTS = 200;

/** A flattened swarm trace event annotated with local receipt metadata for the trailing list. */
type ReceivedEvent = Trace.FlatEvent & {
  /** Monotonic local key for stable list rendering. */
  readonly seq: number;
  /** Local wall-clock time the event was received (ms). */
  readonly receivedAt: number;
};

/**
 * Renders a trailing (auto-scrolling) list of every ephemeral trace event broadcast by remote runtimes
 * over the space swarm (DX-1125), consumed via the swarm-backed {@link Capabilities.RemoteTraceMonitor}.
 * The monitor is subscribed with a space-scoped filter so it surfaces all swarm traffic for this space.
 */
export const SwarmTraceModule = ({ space }: ModuleProps) => {
  const monitor = useOptionalCapability(Capabilities.RemoteTraceMonitor);
  const runtime = useOptionalCapability(Capabilities.ProcessManagerRuntime);
  const [events, setEvents] = useState<ReceivedEvent[]>([]);
  const seqRef = useRef(0);

  useEffect(() => {
    if (!monitor || !runtime) {
      return;
    }

    const fiber = runtime.runFork(
      // A space-scoped filter yields a coarse `space:<id>` swarm subscription, so every remote
      // trace message for this space is delivered and re-filtered client-side.
      monitor.subscribeToTraceMessages({ space: space.id }).pipe(
        // Stamp receipt time as each message arrives, before batching — `groupedWithin` can hold a
        // batch for up to 250ms, so a post-batch `Date.now()` would misdate every event in it.
        Stream.map((message) => ({ message, receivedAt: Date.now() })),
        // Batch bursts (bulk sync broadcasts ~15 msg/s) so render cost is per-window rather than
        // per-message — an unbatched backlog otherwise drains at render speed for minutes.
        Stream.groupedWithin(64, '250 millis'),
        Stream.runForEach((batch) =>
          Effect.sync(() => {
            const incoming = Chunk.toReadonlyArray(batch).flatMap(({ message, receivedAt }) =>
              Trace.flatten(message).map((event) => ({
                ...event,
                seq: seqRef.current++,
                receivedAt,
              })),
            );
            setEvents((prev) => [...prev, ...incoming].slice(-MAX_EVENTS));
          }),
        ),
      ),
    );

    return () => {
      void runtime.runPromise(Fiber.interrupt(fiber));
    };
  }, [monitor, runtime, space.id]);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>Swarm Trace</Toolbar.Text>
          <Toolbar.Separator />
          <Toolbar.Text>{events.length} events</Toolbar.Text>
          <Toolbar.Separator />
          <Toolbar.Button onClick={() => setEvents([])} disabled={events.length === 0}>
            Clear
          </Toolbar.Button>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content className='overflow-hidden'>
        {monitor ? <EventList events={events} /> : <div className='p-2 text-description'>No swarm trace source.</div>}
      </Panel.Content>
    </Panel.Root>
  );
};

/** Auto-scrolling list of received events, newest at the bottom. */
const EventList = ({ events }: { events: readonly ReceivedEvent[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);

  // Only follow the tail while the user is already scrolled to the bottom, so manual
  // scroll-up to inspect an earlier event is not yanked away by incoming traffic.
  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    pinnedRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 16;
  };

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element && pinnedRef.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [events]);

  if (events.length === 0) {
    return <div className='p-2 text-description'>Waiting for swarm trace events…</div>;
  }

  return (
    <div ref={scrollRef} onScroll={handleScroll} className='flex flex-col gap-1 p-2 text-sm overflow-auto h-full'>
      {events.map((event) => (
        <EventRow key={event.seq} event={event} />
      ))}
    </div>
  );
};

/** Memoized so appending a batch re-renders only the appended rows (JsonHighlighter is costly). */
const EventRow = memo(({ event }: { event: ReceivedEvent }) => (
  <div className='flex flex-col gap-1 rounded border border-separator p-2'>
    <div className='flex items-center gap-2 text-xs'>
      <span className='text-description tabular-nums'>{formatTime(event.receivedAt)}</span>
      <span className='font-mono truncate'>{event.type}</span>
      {event.meta.runtimeName && <span className='text-description truncate'>{event.meta.runtimeName}</span>}
      {event.meta.pid && <span className='text-description font-mono truncate'>pid:{event.meta.pid}</span>}
    </div>
    {event.data != null && <JsonHighlighter data={event.data} />}
  </div>
));

EventRow.displayName = 'EventRow';

const formatTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString(undefined, { hour12: false }) +
  `.${String(timestamp % 1000).padStart(3, '0')}`;
