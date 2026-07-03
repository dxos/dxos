//
// Copyright 2026 DXOS.org
//

import { type Channel, createLoopback } from '../channel';
import * as Message from '../Message';
import { serve } from '../rpc';

/** The Composer end of a mock peer: binds a request handler over its channel. */
export class MockComposer {
  #dispose?: () => void;

  constructor(public readonly channel: Channel) {}

  /** Answer inbound requests with the handler's reply (or nothing). */
  handle(handler: (message: Message.Type) => Message.Type | undefined): void {
    this.#dispose?.();
    this.#dispose = serve(this.channel, handler);
  }
}

/** Create an extension channel wired to a `MockComposer`. */
export const createMockPeer = (): { extension: Channel; composer: MockComposer } => {
  const [extension, composerChannel] = createLoopback();
  return { extension, composer: new MockComposer(composerChannel) };
};
