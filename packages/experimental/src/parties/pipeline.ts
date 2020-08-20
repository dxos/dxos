//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import merge from 'lodash/merge';
import { pipeline, Readable, Writable } from 'stream';

import { dxos } from '../proto/gen/testing';

import { createFeedMeta, IFeedBlock } from '../feeds';
import { IEchoStream } from '../items';
import { jsonReplacer } from '../proto';
import { createTransform } from '../util';
import { PartyProcessor } from './party-processor';

interface Options {
  readLogger?: NodeJS.ReadWriteStream;
  writeLogger?: NodeJS.ReadWriteStream;
}

const log = debug('dxos:echo:pipeline');

/**
 * Manages the inbound and outbound message pipelines for an individual party.
 */
export class Pipeline {
  private readonly _partyProcessor: PartyProcessor;
  private readonly _feedReadStream: NodeJS.ReadableStream;
  private readonly _feedWriteStream?: NodeJS.WritableStream;
  private readonly _options: Options;

  // Messages to be consumed from pipeline (e.g., mutations to model).
  private _readStream: Readable | undefined;

  // Messages to write into pipeline (e.g., mutations from model).
  private _writeStream: Writable | undefined;

  /**
   * @param partyProcessor - Processes HALO messages to update party state.
   * @param feedReadStream - Inbound messages from the feed store.
   * @param [feedWriteStream] - Outbound messages to the writable feed.
   * @param [options]
   */
  constructor (
    partyProcessor: PartyProcessor,
    feedReadStream: NodeJS.ReadableStream,
    feedWriteStream?: NodeJS.WritableStream,
    options?: Options
  ) {
    assert(partyProcessor);
    assert(feedReadStream);
    this._partyProcessor = partyProcessor;
    this._feedReadStream = feedReadStream;
    this._feedWriteStream = feedWriteStream;
    this._options = options || {};
  }

  get partyKey () {
    return this._partyProcessor.partyKey;
  }

  get isOpen () {
    return this._readStream !== undefined;
  }

  get readonly () {
    return this._writeStream === undefined;
  }

  get readStream () {
    return this._readStream;
  }

  get writeStream () {
    return this._writeStream;
  }

  /**
   * Create inbound and outbound pipielines.
   * https://nodejs.org/api/stream.html#stream_stream_pipeline_source_transforms_destination_callback
   *
   * Feed
   *   Transform(IFeedBlock => IEchoStream): Party processing (clock ordering)
   *     ItemDemuxer
   *       Transform(dxos.echo.testing.IEchoEnvelope => dxos.echo.testing.IFeedMessage): update clock
   *         Feed
   */
  async open (): Promise<[NodeJS.ReadableStream, NodeJS.WritableStream?]> {
    const { readLogger, writeLogger } = this._options;

    //
    // Processes inbound messages (piped from feed store).
    //
    this._readStream = createTransform<IFeedBlock, IEchoStream>(async (block: IFeedBlock) => {
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
          return {
            meta: createFeedMeta(block),
            data: message.echo
          };
        }
      }

      // TODO(burdon): Can we throw and have the pipeline log (without breaking the stream)?
      log(`Skipping invalid message: ${JSON.stringify(message, jsonReplacer)}`);
    });

    pipeline([
      this._feedReadStream,
      readLogger,
      this._readStream
    ].filter(Boolean) as any[], (err) => {
      // TODO(burdon): Handle error.
      log(err || 'Inbound pipieline closed.');
    });

    //
    // Processes outbound messages (piped to the feed).
    // Sets the current timeframe.
    //
    if (this._feedWriteStream) {
      this._writeStream = createTransform<dxos.echo.testing.IEchoEnvelope, dxos.echo.testing.IFeedMessage>(
        async (message: dxos.echo.testing.IEchoEnvelope) => {
          const data: dxos.echo.testing.IFeedMessage = {
            echo: merge({
              timeframe: this._partyProcessor.timeframe
            }, message)
          };

          return data;
        });

      pipeline([
        this._writeStream,
        writeLogger,
        this._feedWriteStream
      ].filter(Boolean) as any[], (err) => {
        // TODO(burdon): Handle error.
        log(err || 'Outbound pipeline closed.');
      });
    }

    return [
      this._readStream,
      this._writeStream
    ];
  }

  /**
   * Close all streams.
   */
  // TODO(burdon): Does destroy automatically close downstream pipelines? Check close/end events.
  async close () {
    if (this._readStream) {
      this._readStream.destroy();
      this._readStream = undefined;
    }

    if (this._writeStream) {
      this._writeStream.destroy();
      this._writeStream = undefined;
    }
  }
}
