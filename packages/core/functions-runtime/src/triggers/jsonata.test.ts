//
// Copyright 2025 DXOS.org
//

import jsonata from 'jsonata';
import { assert, describe, test } from 'vitest';

import { Obj, Ref, Type } from '@dxos/echo';
import { Trigger, type TriggerEvent } from '@dxos/functions';
import { trim } from '@dxos/util';

describe('jsonata', () => {
  test('extracts simple property', async ({ expect }) => {
    const expression = jsonata('name');
    const result = await expression.evaluate({ name: 'John' });
    expect(result).toBe('John');
  });

  test('transforms object structure', async ({ expect }) => {
    const expression = jsonata('{ "fullName": firstName & " " & lastName, "age": age }');
    const result = await expression.evaluate({ firstName: 'John', lastName: 'Doe', age: 30 });
    expect(result).toEqual({ fullName: 'John Doe', age: 30 });
  });

  test('filters and transforms array', async ({ expect }) => {
    const expression = jsonata('users[age > 18].{ "name": firstName & " " & lastName, "adult": true }');
    const result = await expression.evaluate({
      users: [
        { firstName: 'John', lastName: 'Doe', age: 25 },
        { firstName: 'Jane', lastName: 'Smith', age: 17 },
        { firstName: 'Bob', lastName: 'Johnson', age: 30 },
      ],
    });
    expect(Array.from(result)).toEqual([
      { name: 'John Doe', adult: true },
      { name: 'Bob Johnson', adult: true },
    ]);
  });

  test('calculates aggregate values', async ({ expect }) => {
    const expression = jsonata('{ "total": $sum(items.price), "count": $count(items) }');
    const result = await expression.evaluate({
      items: [
        { name: 'Apple', price: 1.5 },
        { name: 'Banana', price: 0.75 },
        { name: 'Orange', price: 2.0 },
      ],
    });
    expect(result).toEqual({ total: 4.25, count: 3 });
  });

  describe('evaluates expression with trigger event', () => {
    const queueDxn = 'dxn:queue:data:BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE:01J00J9B45YHYSGZQTQMSKMGJ6';
    const event: TriggerEvent.TriggerEvent = {
      queue: queueDxn,
      item: {
        name: 'John',
      },
      cursor: '01J00J9B45YHYSGZQTQMSKMGJ6',
    };

    const obj = Obj.make(Type.Expando, { id: '01KD35WMWTEEE1WQQPYEGD1X2B', name: 'DXOS' });
    const trigger = Trigger.make({
      spec: {
        kind: 'queue',
        queue: queueDxn,
      },
      input: {
        nested: {
          value: 'nested',
        },
        ref: Ref.make(obj),
        value: '"Hello, " & event.item.name & "!"',
      },
    });

    test('basic', async ({ expect }) => {
      const expression = jsonata('event.item.name');
      const result = await expression.evaluate({ trigger, event });
      expect(result).toBe('John');
    });

    test('nested', async ({ expect }) => {
      const expression = jsonata('trigger.input.nested.value');
      const result = await expression.evaluate({ trigger, event });
      expect(result).toBe('nested');
    });

    test('ref', async ({ expect }) => {
      const expression = jsonata('trigger.input.ref');
      const result = await expression.evaluate({ trigger, event });
      assert(Ref.isRef(result), 'Expected a reference');
      expect(result.target).toBe(obj);
    });

    test('value', async ({ expect }) => {
      const expression = jsonata(trigger.input!.value);
      const result = await expression.evaluate({ trigger, event });
      expect(result).toBe('Hello, John!');
    });

    test('input as expression', async ({ expect }) => {
      const input = trim`
      {
        "queue": event.queue,
        "cursor": event.cursor,
        "nested": {
          "value": "nested",
          "name": event.item.name
        },
        "ref": {
          "/": "${Obj.getDXN(obj).toString()}"
        },
        "value": "Hello, " & event.item.name & "!"
      }
      `;
      const expression = jsonata(input);
      const result = await expression.evaluate({ trigger, event });
      expect(result).toMatchSnapshot({
        queue: event.queue,
        cursor: event.cursor,
        nested: {
          value: 'nested',
          name: event.item.name,
        },
        ref: {
          '/': Obj.getDXN(obj).toString(),
        },
        value: 'Hello, John!',
      });
    });

    test('input templating', async ({ expect }) => {
      const input = {
        queue: '{{event.queue}}',
        cursor: '{{event.cursor}}',
        nested: {
          value: 'nested',
          name: '{{event.item.name}}',
        },
        ref: Ref.make(obj),
        value: '{{"Hello, " & event.item.name & "!"}}',
      };
      const transformedInput = JSON.stringify(input, null, 2)
        .replaceAll('"{{', '')
        .replaceAll('}}"', '')
        .replaceAll('\\"', '"');
      const expression = jsonata(transformedInput);
      const result = await expression.evaluate({ trigger, event });
      expect(result).toMatchSnapshot({
        queue: event.queue,
        cursor: event.cursor,
        nested: {
          value: 'nested',
          name: event.item.name,
        },
        ref: {
          '/': Obj.getDXN(obj).toString(),
        },
        value: 'Hello, John!',
      });
    });
  });
});
