//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { Hypercore } from 'hypercore';
import { ProtocolStream } from 'hypercore-protocol';
import { PassThrough, Transform, Writable } from 'streamx';

import { latch } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ComplexMap } from '@dxos/util';

/**
 * Hypercore multiplexer.
 */
// TODO(burdon): Add encoding.
export class Multiplexer {
  private readonly _feeds = new ComplexMap<PublicKey, Hypercore>(PublicKey.hash);
  private readonly _streams = new ComplexMap<PublicKey, ProtocolStream>(PublicKey.hash);

  private _isOpen = false;

  public readonly input = new PassThrough();
  public readonly output = new PassThrough();

  // prettier-ignore
  constructor(
    private readonly _id: string
  ) {}

  get isOpen() {
    return this._isOpen;
  }

  get feeds() {
    return Array.from(this._feeds.values());
  }

  addFeed(core: Hypercore, initiator = false) {
    const stream = core.replicate(initiator, { live: true });

    const feedKey = PublicKey.from(core.key);
    this._feeds.set(feedKey, core);
    this._streams.set(feedKey, stream);
    log('added', { feedKey: PublicKey.from(feedKey) });

    stream
      .pipe(
        new Transform({
          transform: (data: Buffer, next: (err: Error | null, data: any) => void) => {
            log('send', { id: this._id, feedKey: PublicKey.from(feedKey), payload: data.length });
            next(null, {
              feedKey: core.key,
              payload: data
            });
          }
        })
      )
      .pipe(this.output, () => {
        log('pipeline closed', { id: this._id });
        this._isOpen = false;
      });

    return this;
  }

  async open() {
    if (this._isOpen) {
      return;
    }

    this.input.pipe(
      new Writable({
        write: (data: any, next: () => void) => {
          const { feedKey, payload } = data;
          const feedStream = this._streams.get(PublicKey.from(feedKey));
          assert(feedStream, `invalid stream: ${PublicKey.from(feedKey).truncate()}`);
          log('recv', { id: this._id, feedKey: PublicKey.from(feedKey), payload: (payload as Buffer).length });
          feedStream.write(payload);
          next();
        }
      })
    );

    log('opened');
    this._isOpen = true;
  }

  // TODO(burdon): Test if re-entrant?
  async close() {
    if (!this._isOpen) {
      return;
    }

    log('closing...');
    // NOTE: Pipeline closes after stream above, so should strictly wait for that.
    const [closed, setClosed] = latch({ count: this._streams.size });
    Array.from(this._streams.values()).forEach((stream) => {
      stream.once('end', () => {
        log('stream closed');
        setClosed();
      });

      stream.finalize();
    });

    await closed();
    assert(!this._isOpen);

    this._feeds.clear();
    this._streams.clear();
    log('closed');
  }
}
