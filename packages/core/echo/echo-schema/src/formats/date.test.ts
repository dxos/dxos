//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { S } from '@dxos/effect';

import {
  DateOnly,
  DateTime,
  TimeOnly,
  type SimpleDate,
  type SimpleDateTime,
  type SimpleTime,
  toSimpleDate,
  toSimpleTime,
} from './date';
import { toJsonSchema } from '../json';

describe('date', () => {
  test('basic', () => {
    const date = new Date('2024-12-31T23:59:59Z');
    expect(toSimpleDate(date)).to.deep.eq({ year: 2024, month: 12, day: 31 });
    expect(toSimpleTime(date)).to.deep.eq({ hours: 23, minutes: 59, seconds: 59 });
  });

  test('Date', ({ expect }) => {
    const jsonSchema = toJsonSchema(DateOnly);
    console.log(JSON.stringify(jsonSchema));
    const v1: SimpleDate = { year: 1999, month: 12, day: 31 };
    const str = S.encodeUnknownSync(DateOnly)(v1);
    const v2 = S.decodeUnknownSync(DateOnly)(str);
    expect(v1).to.deep.eq(v2);
  });

  test('Time', ({ expect }) => {
    const jsonSchema = toJsonSchema(TimeOnly);
    console.log(JSON.stringify(jsonSchema));
    const v1: SimpleTime = { hours: 23, minutes: 59, seconds: 59 };
    const str = S.encodeUnknownSync(TimeOnly)(v1);
    const v2 = S.decodeUnknownSync(TimeOnly)(str);
    expect(v1).to.deep.eq(v2);
  });

  test('DateTime', ({ expect }) => {
    const jsonSchema = toJsonSchema(DateTime);
    console.log(JSON.stringify(jsonSchema));
    const v1: SimpleDateTime = { year: 1999, month: 12, day: 31, hours: 23, minutes: 59, seconds: 59 };
    const str = S.encodeUnknownSync(DateTime)(v1);
    const v2 = S.decodeUnknownSync(DateTime)(str);
    expect(v1).to.deep.eq(v2);
  });
});
