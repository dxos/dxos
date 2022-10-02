//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { checkType } from '@dxos/debug';
import { FeedMessageBlock } from '@dxos/feeds';
import { PublicKey } from '@dxos/keys';
import { IEchoStream, Timeframe } from '@dxos/protocols';
import { jsonReplacer } from '@dxos/util';

import { CredentialProcessor, PartyStateProvider } from './party-processor';

const log = debug('dxos:echo-db:pipeline');

/**
 * Will start reading feed blocks from the iterator.
 *
 * Exits when the iterator is closed.
 * For database messages looks up the owning member and updates the clock.
 */
export const consumePipeline = (
  iterator: AsyncIterable<FeedMessageBlock>,
  haloProcessor: CredentialProcessor & PartyStateProvider,
  processEcho: (msg: IEchoStream) => Promise<void>,
  onError: (err: Error) => Promise<void>
) => {
  // This will exit cleanly once FeedStoreIterator is closed.
  setImmediate(async () => {
    for await (const block of iterator) {
      try {
        const { data: message } = block;

        //
        // HALO
        //

        if (message.halo) {
          await haloProcessor.processMessage({
            meta: {
              feedKey: block.key,
              seq: block.seq
            },
            data: message.halo
          });
        }

        //
        // ECHO
        //

        if (message.echo) {
          const memberKey = haloProcessor.getFeedOwningMember(PublicKey.from(block.key));
          // TODO(wittjosiah): Is actually a Buffer for some reason. See todo in FeedBlock.
          assert(memberKey, `Ownership of feed ${PublicKey.stringify(block.key as unknown as Buffer)} could not be determined.`);

          // Validate messge.
          const { itemId } = message.echo;
          if (itemId) {
            await processEcho(checkType<IEchoStream>({
              meta: {
                seq: block.seq,
                feedKey: block.key,
                memberKey,
                timeframe: message.timeframe ?? new Timeframe()
              },
              data: message.echo
            }));
          }
        }

        if (!message.halo && !message.echo) {
          // TODO(burdon): Can we throw and have the pipeline log (without breaking the stream)?
          log(`Skipping invalid message: ${JSON.stringify(message, jsonReplacer)}`);
        }
      } catch (error: any) {
        await onError(error);
      }
    }
  });
};
