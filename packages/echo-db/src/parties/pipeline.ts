//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import { Readable } from 'stream';

import { Event } from '@dxos/async';
import { createFeedMeta, EchoEnvelope, FeedBlock, FeedMessage, HaloMessage, IEchoStream, FeedWriter, mapFeedWriter } from '@dxos/echo-protocol';
import { checkType, createReadable, jsonReplacer } from '@dxos/util';

import { TimeframeClock } from '../items/timeframe-clock';
import { PartyProcessor } from './party-processor';

interface Options {
  readLogger?: (msg: any) => void;
  writeLogger?: (msg: any) => void;
}

const log = debug('dxos:echo:pipeline');

/**
 * Manages the inbound and outbound message streams for an individual party.
 */
// TODO(burdon): Requires major refactoring/simplification?
export class Pipeline {
  private readonly _errors = new Event<Error>();

  /**
   * Messages to be consumed from the pipeline (e.g., mutations to model).
   */
  private _inboundEchoStream: Readable | undefined;

  /**
   * Messages to write into pipeline (e.g., mutations from model).
   */
  private _outboundEchoStream: FeedWriter<EchoEnvelope> | undefined;

  // TODO(burdon): Pair with PartyProcessor.
  /**
   * Halo message stream to write into pipeline.
   */
  private _outboundHaloStream: FeedWriter<HaloMessage> | undefined;

  /**
   * @param _partyProcessor Processes HALO messages to update party state.
   * @param _feedReadStream Inbound messages from the feed store.
   * @param _timeframeClock Tracks current echo timestamp.
   * @param _feedWriter Outbound messages to the writeStream feed.
   * @param _options
   */
  constructor (
    private readonly _partyProcessor: PartyProcessor,
    private readonly _feedReadStream: AsyncIterable<FeedBlock>,
    private readonly _timeframeClock: TimeframeClock,
    private readonly _feedWriter?: FeedWriter<FeedMessage>,
    private readonly _options: Options = {}
  ) {}

  get partyKey () {
    return this._partyProcessor.partyKey;
  }

  get isOpen () {
    return this._inboundEchoStream !== undefined;
  }

  get readOnly () {
    return this._outboundEchoStream === undefined;
  }

  get inboundEchoStream () {
    return this._inboundEchoStream;
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
  async open (): Promise<[NodeJS.ReadableStream, FeedWriter<EchoEnvelope>?]> {
    const { readLogger, writeLogger } = this._options;

    this._inboundEchoStream = createReadable();

    setImmediate(async () => {
      for await (const block of this._feedReadStream) {
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
            this._timeframeClock.updateTimeframe(block.key, block.seq);

            // Validate messge.
            const { itemId } = message.echo;
            if (itemId) {
              assert(this._inboundEchoStream);
              this._inboundEchoStream.push(checkType<IEchoStream>({
                meta: {
                  seq: block.seq,
                  feedKey: block.key,
                  memberKey: this._partyProcessor.getFeedOwningMember(block.key)
                },
                data: message.echo
              }));
            }
          }

          if (!message.halo && !message.echo) {
            // TODO(burdon): Can we throw and have the pipeline log (without breaking the stream)?
            log(`Skipping invalid message: ${JSON.stringify(message, jsonReplacer)}`);
          }
        } catch (err) {
          console.error(`Error in message processing: ${err}`);
        }
      }
    });

    //
    // Processes outbound messages (piped to the feed).
    // Sets the current timeframe.
    //
    if (this._feedWriter) {
      const loggingWriter = mapFeedWriter<FeedMessage, FeedMessage>(async msg => {
        writeLogger?.(msg);
        return msg;
      }, this._feedWriter);

      this._outboundEchoStream = mapFeedWriter<EchoEnvelope, FeedMessage>(async message => ({ echo: message }), loggingWriter);
      this._outboundHaloStream = mapFeedWriter<unknown, FeedMessage>(async message => ({ halo: message }), loggingWriter);
    }

    return [
      this._inboundEchoStream,
      this._outboundEchoStream
    ];
  }

  /**
   * Close all streams.
   */
  // TODO(burdon): Create test that all streams are closed cleanly.
  async close () {
    // TODO(marik-d): Add functinality to stop FeedStoreIterator.

    if (this._inboundEchoStream) {
      this._inboundEchoStream.destroy();
      this._inboundEchoStream = undefined;
    }

    this._outboundEchoStream = undefined;
  }
}
