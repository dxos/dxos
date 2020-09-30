//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import merge from 'lodash/merge';
import pump from 'pump';
import { Readable, Writable } from 'stream';

import { Event } from '@dxos/async';
import { createFeedMeta, EchoEnvelope, FeedBlock, FeedMessage } from '@dxos/echo-protocol';
import { createReadable, createTransform, jsonReplacer } from '@dxos/util';

import { PartyProcessor } from './party-processor';

interface Options {
  readLogger?: NodeJS.ReadWriteStream;
  writeLogger?: NodeJS.ReadWriteStream;
}

const log = debug('dxos:echo:pipeline');
const error = debug('dxos:echo:pipeline:error');

/**
 * Manages the inbound and outbound message streams for an individual party.
 */
// TODO(burdon): Requires major refactoring/simplification?
export class Pipeline {
  private readonly _errors = new Event<Error>();

  // TODO(burdon): Split (e.g., pass in Timeline and stream)?
  private readonly _partyProcessor: PartyProcessor;

  /**
   * Iterator for messages comming from feeds.
   */
  private readonly _messageIterator: AsyncIterable<FeedBlock>;

  /**
   * Stream for writing messages to this peer's writable feed.
   */
  private readonly _feedWriteStream?: NodeJS.WritableStream;

  private readonly _options: Options;

  /**
   * Messages to be consumed from the pipeline (e.g., mutations to model).
   */
  private _inboundEchoStream: Readable | undefined;

  /**
   * Messages to write into pipeline (e.g., mutations from model).
   */
  private _outboundEchoStream: Writable | undefined;

  // TODO(burdon): Pair with PartyProcessor.
  /**
   * Halo message stream to write into pipeline.
   */
  private _outboundHaloStream: Writable | undefined;

  /**
   * @param {PartyProcessor} partyProcessor - Processes HALO messages to update party state.
   * @param feedReadStream - Inbound messages from the feed store.
   * @param [feedWriteStream] - Outbound messages to the writeStream feed.
   * @param replicatorFactory
   * @param [options]
   */
  constructor (
    partyProcessor: PartyProcessor,
    feedReadStream: AsyncIterable<FeedBlock>,
    feedWriteStream?: NodeJS.WritableStream,
    options?: Options
  ) {
    assert(partyProcessor);
    assert(feedReadStream);
    this._partyProcessor = partyProcessor;
    this._messageIterator = feedReadStream;
    this._feedWriteStream = feedWriteStream;
    this._options = options || {};
  }

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
  async open (): Promise<[NodeJS.ReadableStream, NodeJS.WritableStream?]> {
    const { readLogger, writeLogger } = this._options;

    this._inboundEchoStream = createReadable();

    setImmediate(async () => {
      for await (const block of this._messageIterator) {
        if (readLogger) {
          readLogger.write(block as any);
        }

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

          // Update timeframe.
          // NOTE: It is OK to update here even though the message may not have been processed,
          // since any paused dependent message must be intended for this stream.
          const { key, seq } = block;
          this._partyProcessor.updateTimeframe(key, seq);

          //
          // ECHO
          //
          if (message.echo) {
            // Validate messge.
            const { itemId } = message.echo;
            if (itemId) {
              assert(this._inboundEchoStream);
              this._inboundEchoStream.push({
                meta: createFeedMeta(block),
                data: message.echo
              });
            }
          }

          if (!message.halo && !message.echo) {
            // TODO(burdon): Can we throw and have the pipeline log (without breaking the stream)?
            log(`Skipping invalid message: ${JSON.stringify(message, jsonReplacer)}`);
          }
        } catch (err) {
          log(`Error in message processing: ${err}`);
        }
      }
    });

    //
    // Processes outbound messages (piped to the feed).
    // Sets the current timeframe.
    //
    if (this._feedWriteStream) {
      this._outboundEchoStream = createTransform<EchoEnvelope, FeedMessage>(async message => ({
        echo: merge({
          timeframe: this._partyProcessor.timeframe
        }, message)
      }));

      pump([
        this._outboundEchoStream,
        writeLogger,
        this._feedWriteStream
      ].filter(Boolean) as any[], (err: Error | undefined) => {
        // TODO(burdon): Handle error.
        error('Outbound ECHO pipeline:', err || 'closed');
        if (err) {
          this._errors.emit(err);
        }
      });

      this._outboundHaloStream = createTransform<unknown, FeedMessage>(async message => ({ halo: message }));

      pump([
        this._outboundHaloStream,
        writeLogger,
        this._feedWriteStream
      ].filter(Boolean) as any[], (err: Error | undefined) => {
        // TODO(burdon): Handle error.
        error('Outbound HALO pipeline:', err || 'closed');
        if (err) {
          this._errors.emit(err);
        }
      });
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

    if (this._outboundEchoStream) {
      this._outboundEchoStream.destroy();
      this._outboundEchoStream = undefined;
    }
  }
}
