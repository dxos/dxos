//
// Copyright 2019 DXOS.org
//

import streamFrom from 'from2';
import assert from 'node:assert';

import { PublicKey } from '@dxos/keys';

import { FeedDescriptor } from './feed-descriptor';

// TODO(burdon): Reconcile with feed-store iterator.
//  https://github.com/dxos/dxos/pull/1611#discussion_r989889196
export type CreateBatchStreamOptions = {
  start?: number
  end?: number
  live?: boolean
  snapshot?: boolean
  batch?: number
  metadata?: any
  tail?: boolean
}

/**
 *
 */
export const createBatchStream = (
  feed: FeedDescriptor,
  opts: CreateBatchStreamOptions = {}
): NodeJS.ReadableStream => {
  assert(!opts.batch || opts.batch > 0, 'batch must be major or equal to 1.');

  let start = opts.start || 0;
  let end = typeof opts.end === 'number' ? opts.end : -1;
  const live = !!opts.live;
  const snapshot = opts.snapshot !== false;
  const batch = opts.batch || 100;
  const metadata = opts.metadata || {};
  let batchEnd = 0;
  let batchLimit = 0;
  let seq = start;
  let first = true;
  let firstSyncEnd = end;

  const range2 = await feed.download({ start, end, linear: true });

  // TODO(burdon): Make async.
  const read = (size: any, cb?: any) => {
    if (!feed.opened) {
      return open(size, cb);
    }
    if (!feed.readable) {
      return cb(new Error('Feed is closed'));
    }

    if (first) {
      if (end === -1) {
        if (live) {
          end = Infinity;
        } else if (snapshot) {
          end = feed.length;
        }
        if (start > end) {
          return cb(null, null);
        }
      }

      if (opts.tail) {
        start = feed.length;
      }

      firstSyncEnd = end === Infinity ? feed.length : end;
      first = false;
    }

    if (start === end || (end === -1 && start === feed.length)) {
      return cb(null, null);
    }

    if (batch === 1) {
      seq = setStart(start + 1);
      feed.get(seq, opts, (err: any, data: any) => {
        if (err) {
          return cb(err);
        }

        cb(null, [buildMessage(data)]);
      });

      return;
    }

    batchEnd = start + batch;
    batchLimit = end === Infinity ? feed.length : end;
    if (batchEnd > batchLimit) {
      batchEnd = batchLimit;
    }

    if (!feed.downloaded(start, batchEnd)) {
      seq = setStart(start + 1);
      feed.get(seq, opts, (err, data) => {
        if (err) {
          return cb(err);
        }

        cb(null, [buildMessage(data as any)]);
      });
      return;
    }

    seq = setStart(batchEnd);

    // TODO(burdon): Deprecated.
    feed.getBatch(seq, batchEnd, opts, (err: Error | null, blocks?: Buffer[]) => {
      if (err || blocks?.length === 0) { // TODO(burdon): Block length 0 is not an error.
        cb(err);
        return;
      }

      cb(null, blocks!.map(buildMessage));
    });
  };

  const buildMessage = (data: object) => {
    return {
      key: PublicKey.from(feed.key), // TODO(burdon): Document.
      seq: seq++,
      data,
      sync: feed.length === seq || firstSyncEnd === 0 || firstSyncEnd === seq,
      ...metadata
    };
  };

  const cleanup = () => {
    if (!range) {
      return;
    }
    feed.undownload(range);
    range = null;
  };

  const open = (size: any, cb: (err: Error) => void) => {
    feed.ready(err => {
      if (err) {
        return cb(err);
      }

      read(size, cb);
    });
  };

  const setStart = (value: number) => {
    const prevStart = start;
    start = value;
    range.start = start;
    if (range.iterator) {
      range.iterator.start = start;
    }

    return prevStart;
  };

  return streamFrom.obj(read)
    .on('end', cleanup)
    .on('close', cleanup);
};
