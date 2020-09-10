//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import merge from 'lodash/merge';
import pump from 'pump';
import { Readable, Writable } from 'stream';

import { Event } from '@dxos/async';
import { protocol, createFeedMeta, FeedBlock, IEchoStream, IHaloStream } from '@dxos/experimental-echo-protocol';
import { createTransform, jsonReplacer } from '@dxos/experimental-util';

import { ReplicatorFactory, IReplicationAdapter } from '../replication';
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
export class Pipeline {
  private readonly _errors = new Event<Error>();
  private readonly _partyProcessor: PartyProcessor; // TODO(burdon): Remove.
  private readonly _feedReadStream: NodeJS.ReadableStream;
  private readonly _feedWriteStream?: NodeJS.WritableStream;
  private readonly _options: Options;

  // Messages to be consumed from pipeline (e.g., mutations to model).
  private _readStream: Readable | undefined;

  // Messages to write into pipeline (e.g., mutations from model).
  private _writeStream: Writable | undefined;

  // Halo messages to write into pipeline.
  private _haloWriteStream: Writable | undefined;

  private _replicationAdapter?: IReplicationAdapter;

  /**
   * @param {PartyProcessor} partyProcessor - Processes HALO messages to update party state.
   * @param feedReadStream - Inbound messages from the feed store.
   * @param [feedWriteStream] - Outbound messages to the writeStream feed.
   * @param [options]
   */
  constructor (
    partyProcessor: PartyProcessor,
    feedReadStream: NodeJS.ReadableStream,
    feedWriteStream?: NodeJS.WritableStream,
    private readonly replicatorFactory?: ReplicatorFactory,
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

  get readOnly () {
    return this._writeStream === undefined;
  }

  get readStream () {
    return this._readStream;
  }

  get writeStream () {
    return this._writeStream;
  }

  get haloWriteStream () {
    return this._haloWriteStream;
  }

  get errors () {
    return this._errors;
  }

  get memberFeeds () {
    return this._partyProcessor.feedKeys;
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

    //
    // Processes inbound messages (piped from feed store).
    //
    this._readStream = createTransform<FeedBlock, IEchoStream>(async (block: FeedBlock) => {
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
            return {
              meta: createFeedMeta(block),
              data: message.echo
            };
          }
        }

        if (!message.halo && !message.echo) {
          // TODO(burdon): Can we throw and have the pipeline log (without breaking the stream)?
          log(`Skipping invalid message: ${JSON.stringify(message, jsonReplacer)}`);
        }
      } catch (err) {
        log(`Error in message processing: ${err}`);
      }
    });

    pump([
      this._feedReadStream,
      readLogger,
      this._readStream
    ].filter(Boolean) as any[], (err: Error | undefined) => {
      // TODO(burdon): Handle error.
      error('Inbound pipieline:', err || 'closed');
      if (err) {
        this._errors.emit(err);
      }
    });

    //
    // Processes outbound messages (piped to the feed).
    // Sets the current timeframe.
    //
    if (this._feedWriteStream) {
      this._writeStream = createTransform<protocol.dxos.echo.IEchoEnvelope, protocol.dxos.IFeedMessage>(
        async (message: protocol.dxos.echo.IEchoEnvelope) => {
          const data: protocol.dxos.IFeedMessage = {
            echo: merge({
              timeframe: this._partyProcessor.timeframe
            }, message)
          };

          return data;
        }
      );

      pump([
        this._writeStream,
        writeLogger,
        this._feedWriteStream
      ].filter(Boolean) as any[], (err: Error | undefined) => {
        // TODO(burdon): Handle error.
        error('Outbound pipeline:', err || 'closed');
        if (err) {
          this._errors.emit(err);
        }
      });

      this._haloWriteStream = createTransform<any, protocol.dxos.IFeedMessage>(
        async (message: any) => {
          const data: protocol.dxos.IFeedMessage = {
            halo: message
          };

          return data;
        }
      );

      // TODO(marik-d): Code duplication
      pump([
        this._haloWriteStream,
        writeLogger,
        this._feedWriteStream
      ].filter(Boolean) as any[], (err: Error | undefined) => {
        // TODO(burdon): Handle error.
        error('Outbound pipeline:', err || 'closed');
        if (err) {
          this._errors.emit(err);
        }
      });
    }

    // Replication
    this._replicationAdapter = this.replicatorFactory?.(this.partyKey, this._partyProcessor.getActiveFeedSet());
    this._replicationAdapter?.start();

    return [
      this._readStream,
      this._writeStream
    ];
  }

  /**
   * Close all streams.
   */
  // TODO(burdon): Create test that all streams are closed cleanly.
  async close () {
    if (this._readStream) {
      this._readStream.destroy();
      this._readStream = undefined;
    }

    if (this._writeStream) {
      this._writeStream.destroy();
      this._writeStream = undefined;
    }

    this._replicationAdapter?.stop();
  }
}
