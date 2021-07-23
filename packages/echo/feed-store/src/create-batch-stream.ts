//
// Copyright 2019 DXOS.org
//

import assert from 'assert';
import streamFrom from 'from2';

interface CreateBatchStreamOptions {
  start?: number,
  end?: number,
  live?: any,
  snapshot?: boolean,
  batch?: number,
  metadata?: any,
  tail?: boolean
}

export default function createBatchStream (feed: any, opts: CreateBatchStreamOptions = {}) {
  assert(!opts.batch || opts.batch > 0, 'batch must be major or equal to 1');

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

  let range = feed.download({ start, end, linear: true });

  return streamFrom.obj(read).on('end', cleanup).on('close', cleanup);

  function read (size: any, cb?: any) {
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
      feed.get(seq, opts, (err: Error, data: any) => {
        if (err) {
          return cb(err);
        }
        cb(null, [buildMessage(data)]);
      });
      return;
    }

    seq = setStart(batchEnd);
    feed.getBatch(seq, batchEnd, opts, (err: Error, messages: any[]) => {
      if (err || messages.length === 0) {
        cb(err);
        return;
      }

      cb(null, messages.map(buildMessage));
    });
  }

  function buildMessage (data: object) {
    const message = {
      key: feed.key,
      seq: seq++,
      data,
      sync: feed.length === seq || firstSyncEnd === 0 || firstSyncEnd === seq,
      ...metadata
    };

    return message;
  }

  function cleanup () {
    if (!range) {
      return;
    }
    feed.undownload(range);
    range = null;
  }

  function open (size: any, cb: (err: Error) => void) {
    feed.ready(function (err: Error) {
      if (err) {
        return cb(err);
      }
      read(size, cb);
    });
  }

  function setStart (value: number) {
    const prevStart = start;
    start = value;
    range.start = start;
    if (range.iterator) {
      range.iterator.start = start;
    }
    return prevStart;
  }
}
