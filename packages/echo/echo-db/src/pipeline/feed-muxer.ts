//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { Event } from '@dxos/async';
import { Message as HaloMessage } from '@dxos/credentials';
import { checkType } from '@dxos/debug';
import {
  createFeedMeta, EchoEnvelope, FeedMessage, FeedStoreIterator, FeedWriter, IEchoStream, mapFeedWriter
} from '@dxos/echo-protocol';
import { PublicKey, Timeframe } from '@dxos/protocols';
import { jsonReplacer } from '@dxos/util';

import { EchoProcessor, TimeframeClock } from '../packlets/database';
import { CredentialProcessor, PartyStateProvider } from './party-processor';
import { Credential } from '@dxos/halo-protocol/src/proto';

interface Options {
  readLogger?: (msg: any) => void
  writeLogger?: (msg: any) => void
}

const log = debug('dxos:echo-db:pipeline');

/**
 * Manages the inbound and outbound message streams for an individual party.
 * Reads messages from individual feeds and splits them into ECHO and HALO streams.
 */
export class FeedMuxer {
  private readonly _errors = new Event<Error>();

  private _isOpen = false;

  /**
   * Messages to write into pipeline (e.g., mutations from model).
   */
  private _outboundEchoStream: FeedWriter<EchoEnvelope> | undefined;

  /**
   * Halo message stream to write into pipeline.
   */
  private _outboundHaloStream: FeedWriter<Credential> | undefined;

  private _echoProcessor: EchoProcessor | undefined;

  /**
   * @param _partyProcessor Processes HALO messages to update party state.
   * @param _feedStorIterator Inbound messages from the feed store.
   * @param _timeframeClock Tracks current echo timestamp.
   * @param _feedWriter Outbound messages to the writeStream feed.
   * @param _options
   */
  constructor (
    private readonly _partyProcessor: CredentialProcessor & PartyStateProvider,
    private readonly _feedStorIterator: FeedStoreIterator,
    private readonly _timeframeClock: TimeframeClock,
    private readonly _feedWriter?: FeedWriter<FeedMessage>,
    private readonly _options: Options = {}
  ) {
    if (this._feedWriter) {
      const loggingWriter = mapFeedWriter<FeedMessage, FeedMessage>(async msg => {
        this._options.writeLogger?.(msg);
        return msg;
      }, this._feedWriter);

      this._outboundEchoStream = mapFeedWriter<EchoEnvelope, FeedMessage>(async message => ({
        timeframe: this._timeframeClock.timeframe,
        echo: message
      }), loggingWriter);
      this._outboundHaloStream = mapFeedWriter<Credential, FeedMessage>(async credential => ({
        timeframe: this._timeframeClock.timeframe,
        halo: { credential }
      }), loggingWriter);
    }
  }

  get isOpen () {
    return this._isOpen;
  }

  get readOnly () {
    return this._outboundEchoStream === undefined;
  }

  get outboundEchoStream () {
    return this._outboundEchoStream;
  }

  get outboundHaloStream () {
    return this._outboundHaloStream;
  }

  get errors () {
    return this._errors;
  }

  setEchoProcessor (processor: EchoProcessor) {
    this._echoProcessor = processor;
  }

  /**
   * Create inbound and outbound pipielines.
   * https://nodejs.org/api/stream.html#stream_stream_pipeline_source_transforms_destination_callback
   *
   * Feed
   *   Transform(FeedBlock => IEchoStream): Party processing (clock ordering)
   *     ItemDemuxer
   *       Transform(dxos.echo.IEchoEnvelope => dxos.IFeedMessage): update clock
   *         Feed
   */
  async open (): Promise<FeedWriter<EchoEnvelope> | undefined> {
    const { readLogger } = this._options;

    // This will exit cleanly once FeedStoreIterator is closed.
    setImmediate(async () => {
      for await (const block of this._feedStorIterator) {
        readLogger?.(block as any);

        try {
          const { data: message } = block;

          //
          // HALO
          //

          if (message.halo) {
            await this._partyProcessor.processMessage({
              meta: createFeedMeta(block),
              data: message.halo
            });
          }

          //
          // ECHO
          //

          if (message.echo) {
            const memberKey = this._partyProcessor.getFeedOwningMember(PublicKey.from(block.key));
            // TODO(wittjosiah): Is actually a Buffer for some reason. See todo in IFeedGenericBlock.
            assert(memberKey, `Ownership of feed ${PublicKey.stringify(block.key as unknown as Buffer)} could not be determined.`);

            // Validate messge.
            const { itemId } = message.echo;
            if (itemId) {
              assert(this._echoProcessor);
              await this._echoProcessor(checkType<IEchoStream>({
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

          this._timeframeClock.updateTimeframe(PublicKey.from(block.key), block.seq);
        } catch (err: any) {
          console.error('Error in message processing.');
          console.error(err);
        }
      }
    });

    return this._outboundEchoStream;
  }

  /**
   * Close all streams.
   */
  // TODO(burdon): Create test that all streams are closed cleanly.
  async close () {
    await this._feedStorIterator.close();

    this._outboundEchoStream = undefined;
    this._outboundHaloStream = undefined;
    this._echoProcessor = undefined;
    this._isOpen = false;
  }
}
