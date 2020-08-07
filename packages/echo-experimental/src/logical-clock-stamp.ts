//
// Copyright 2020 DxOS.org
//

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import assert from 'assert';
import debug from 'debug';

const log = debug('dxos.echo.consistency');

// TODO(dboreham): Separate abstract behavior from vector implementation.

// TODO(dboreham): Rationalize with FeedId.
type NodeId = Buffer;

// BigInt/Buffer conversion functions.
// From: https://coolaj86.com/articles/convert-js-bigints-to-typedarrays/
// Exported only for unit testing
// TODO(dboreham): Library or util?
export const BigIntToBuffer = (input: BigInt) => {
  let hex = BigInt(input).toString(16);
  if (hex.length % 2) { hex = '0' + hex; }

  const length = hex.length / 2;
  const u8 = new Uint8Array(length);

  let i = 0;
  let j = 0;
  while (i < length) {
    u8[i] = parseInt(hex.slice(j, j + 2), 16);
    i += 1;
    j += 2;
  }

  return Buffer.from(u8);
};

export const BufferToBigInt = (input: Buffer) => {
  // TODO(dboreham): Character array?
  const hex:string[] = [];
  const u8 = Uint8Array.from(input);

  u8.forEach((i) => {
    let h = i.toString(16);
    if (h.length % 2) { h = '0' + h; }
    hex.push(h);
  });

  return BigInt('0x' + hex.join(''));
};

// https://www.typescriptlang.org/docs/handbook/enums.html
export enum Order {
  CONCURRENT,
  EQUAL,
  BEFORE,
  AFTER
}

const getLowestNodeId = (nodeIds: bigint[]): bigint => {
  return nodeIds.reduce((min, curr) => curr < min ? curr : min, nodeIds[0]);
};

export class LogicalClockStamp {
  private _vector: Map<bigint, number>;

  constructor (
    data: [NodeId, number][] = []
  ) {
    this._vector = new Map(data.map(([nodeId, seq]) => [BufferToBigInt(nodeId), seq]));
  }

  static zero (): LogicalClockStamp {
    // Empty map from constructor means zero.
    return new LogicalClockStamp();
  }

  static compare (a: LogicalClockStamp, b: LogicalClockStamp): Order {
    log(`Compare a: ${a.log()}`);
    log(`Compare b: ${b.log()}`);
    const nodeIds: Set<bigint> = new Set();
    // TODO(dboreham): set.addAllFrom(Iteraable)? or set.union(a,b)?
    for (const key of a._vector.keys()) {
      nodeIds.add(key);
    }
    for (const key of b._vector.keys()) {
      nodeIds.add(key);
    }
    let allGreaterThanOrEqual = true;
    let allLessThanOrEqual = true;
    let allEqual = true;
    for (const nodeId of nodeIds) {
      const aSeq = a._getSeqForNode(nodeId);
      const bSeq = b._getSeqForNode(nodeId);
      // TODO(dboreham): Remove logging when debugged.
      log(`aSeq:${aSeq} bSeq:${bSeq}`);
      if (aSeq !== bSeq) {
        allEqual = false;
      }
      if (aSeq > bSeq) {
        allGreaterThanOrEqual = false;
      }
      if (aSeq < bSeq) {
        allLessThanOrEqual = false;
      }
    }
    // if order is significant
    if (allEqual) {
      return Order.EQUAL;
    } else if (allGreaterThanOrEqual) {
      return Order.AFTER;
    } else if (allLessThanOrEqual) {
      return Order.BEFORE;
    } else {
      return Order.CONCURRENT;
    }
  }

  static totalCompare (a: LogicalClockStamp, b: LogicalClockStamp):Order {
    const partialOrder = LogicalClockStamp.compare(a, b);
    if (partialOrder === Order.CONCURRENT) {
      const aLowestNodeId = getLowestNodeId(Array.from(a._vector.keys()));
      const bLowestNodeId = getLowestNodeId(Array.from(b._vector.keys()));
      log(`aLowest: ${BigIntToBuffer(aLowestNodeId).toString('hex')}, bLowest: ${BigIntToBuffer(bLowestNodeId).toString('hex')}`);
      if (aLowestNodeId === bLowestNodeId) {
        // If the two share the same lowest node id use the seq for that node id to break tie.
        const aSeq = a._vector.get(aLowestNodeId);
        assert(aSeq);
        const bSeq = b._vector.get(bLowestNodeId);
        assert(bSeq);
        log(`tie: aSeq: ${aSeq}, bSeq:${bSeq} `);
        return aSeq < bSeq ? Order.AFTER : Order.BEFORE;
      } else {
        // Otherwise pick the stamp with the lowest node id.
        return aLowestNodeId < bLowestNodeId ? Order.AFTER : Order.BEFORE;
      }
    } else {
      return partialOrder;
    }
  }

  // TODO(dboreham): Encoding scheme is a hack : use typed protocol buffer schema definition.
  toObject (): Record<string, number> {
    return objectFromEntries(Array.from(this._vector.entries()).map(([key, value]) => [BigIntToBuffer(key).toString('hex'), value]));
  }

  static fromObject (source: Record<string, number>): LogicalClockStamp {
    return new LogicalClockStamp(Object.entries(source).map(([key, seq]) => [Buffer.from(key), seq]));
  }

  log (): string {
    // TODO(dboreham): Use DXOS lib for Buffer as Key.
    return Array.from(this._vector.entries()).map(([key, value]) => `${BigIntToBuffer(key).toString('hex')}:${value}`).join(', ');
  }

  private _getSeqForNode (nodeId: bigint): number {
    const seq = this._vector.get(nodeId);
    return (seq === undefined) ? 0 : seq;
  }
}

function objectFromEntries<K extends keyof any, V> (entries: [K, V][]): Record<K, V> {
  const res = {} as any;
  for (const [key, val] of entries) {
    res[key] = val;
  }
  return res;
}
