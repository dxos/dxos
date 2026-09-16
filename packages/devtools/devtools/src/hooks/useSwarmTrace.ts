//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Stream from 'effect/Stream';
import { useCallback, useEffect, useRef, useState } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import { useOptionalCapability } from '@dxos/app-framework/ui';
import type * as Trace from '@dxos/compute/Trace';
import { useSpaces } from '@dxos/react-client/echo';

/** Cap on retained broadcasts so a long-lived session does not grow the list unbounded. */
const MAX_MESSAGES = 200;

/**
 * One received swarm broadcast, annotated with local receipt metadata. Typed by the wire shape
 * rather than the ECHO object so a fixture can be a plain literal.
 */
export type ReceivedMessage = {
  readonly id: string;
  readonly receivedAt: number;
  readonly message: Pick<Trace.MessageData, 'meta' | 'events'>;
};

export type SwarmTrace = {
  messages: ReceivedMessage[];
  spaceCount: number;
  /** `false` when no remote trace monitor is contributed (a local-only deployment). */
  available: boolean;
  clear: () => void;
};

/**
 * Every ephemeral trace message remote runtimes announce over the space swarm (DX-1125), subscribed
 * per space because an empty {@link Trace.Filter} derives no swarm tag.
 */
export const useSwarmTrace = (): SwarmTrace => {
  const monitor = useOptionalCapability(Capabilities.RemoteTraceMonitor);
  const runtime = useOptionalCapability(Capabilities.ProcessManagerRuntime);
  const spaces = useSpaces();
  const [messages, setMessages] = useState<ReceivedMessage[]>([]);
  const seqRef = useRef(0);

  // Joined so the effect keys on membership, not on the array identity `useSpaces` returns.
  const spaceIds = spaces.map((space) => space.id).join(',');
  useEffect(() => {
    if (!monitor || !runtime || spaceIds.length === 0) {
      return;
    }

    const fibers = spaceIds.split(',').map((space) =>
      runtime.runFork(
        monitor.subscribeToTraceMessages({ space }).pipe(
          // Stamped before batching: `groupedWithin` can hold a batch for 250ms.
          Stream.map((message) => ({ message, receivedAt: Date.now() })),
          // Bulk sync announcements arrive ~15/s; batch so render cost is per window, not per message.
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

  const clear = useCallback(() => setMessages([]), []);
  return { messages, spaceCount: spaces.length, available: !!monitor, clear };
};
