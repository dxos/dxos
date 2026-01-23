//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { log } from '@dxos/log';

import { toJsonSchema } from '../json-schema';

import {
  DateOnly,
  DateTime,
  type SimpleDate,
  type SimpleDateTime,
  type SimpleTime,
  TimeOnly,
  toSimpleDate,
  toSimpleTime,
} from './date';

describe.skip('date', () => {
  test('basic', () => {
    const date = new Date('2024-12-31T23:59:59Z');
    expect(toSimpleDate(date)).to.deep.eq({ year: 2024, month: 12, day: 31 });
    expect(toSimpleTime(date)).to.deep.eq({ hours: 23, minutes: 59, seconds: 59 });
  });

  test('Date', ({ expect }) => {
    const jsonSchema = toJsonSchema(DateOnly);
    log('schema', { jsonSchema });
    const v1: SimpleDate = { year: 1999, month: 12, day: 31 };
    const str = Schema.encodeUnknownSync(DateOnly)(v1);
    const v2 = Schema.decodeUnknownSync(DateOnly)(str);
    expect(v1).to.deep.eq(v2);
  });

  test('Time', ({ expect }) => {
    const jsonSchema = toJsonSchema(TimeOnly);
    log('schema', { jsonSchema });
    const v1: SimpleTime = { hours: 23, minutes: 59, seconds: 59 };
    const str = Schema.encodeUnknownSync(TimeOnly)(v1);
    const v2 = Schema.decodeUnknownSync(TimeOnly)(str);
    expect(v1).to.deep.eq(v2);
  });

  test('DateTime', ({ expect }) => {
    const jsonSchema = toJsonSchema(DateTime);
    log('schema', { jsonSchema });
    const v1: SimpleDateTime = { year: 1999, month: 12, day: 31, hours: 23, minutes: 59, seconds: 59 };
    const str = Schema.encodeUnknownSync(DateTime)(v1);
    const v2 = Schema.decodeUnknownSync(DateTime)(str);
    expect(v1).to.deep.eq(v2);
  });
});
