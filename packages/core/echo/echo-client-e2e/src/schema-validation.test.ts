//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Trigger } from '@dxos/compute';
import { Feed, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Organization, Task } from '@dxos/types';

describe('schema validation', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  describe('Organization', () => {
    test('Obj.make accepts valid props', ({ expect }) => {
      const org = Obj.make(Organization.Organization, { name: 'Acme Corp', status: 'active' });
      expect(org.name).toBe('Acme Corp');
      expect(org.status).toBe('active');
    });

    test('Obj.make accepts missing optional fields', ({ expect }) => {
      const org = Obj.make(Organization.Organization, {});
      expect(org.name).toBeUndefined();
      expect(org.status).toBeUndefined();
    });

    test('Obj.make rejects invalid status literal', ({ expect }) => {
      expect(() => Obj.make(Organization.Organization, { status: 'invalid-status' } as any)).toThrow();
    });

    test('Obj.make rejects invalid field type', ({ expect }) => {
      expect(() => Obj.make(Organization.Organization, { name: 123 } as any)).toThrow();
    });

    // JSON schema sets additionalProperties: false and runtime validation rejects extras.
    test('Obj.make rejects extra unknown fields', ({ expect }) => {
      expect(() => Obj.make(Organization.Organization, { name: 'Acme', unknownField: 'extra' } as any)).toThrow(
        /Unknown property/,
      );
    });

    test('Obj.update rejects extra unknown fields', ({ expect }) => {
      const org = Obj.make(Organization.Organization, { name: 'Acme' });
      expect(() =>
        Obj.update(org, (org) => {
          (org as any).unknownField = 'extra';
        }),
      ).toThrow(/Unknown property/);
    });

    test('db.add rejects Organization created with invalid props', async ({ expect }) => {
      const { db } = await builder.createDatabase({ types: [Organization.Organization] });
      expect(() =>
        db.add(Obj.make(Organization.Organization, { status: 'invalid-status' } as any)),
      ).toThrow();
    });
  });

  describe('Task', () => {
    test('Obj.make rejects missing required title', ({ expect }) => {
      expect(() => Obj.make(Task.Task, {} as any)).toThrow(/title/i);
    });

    test('Obj.make accepts valid props', ({ expect }) => {
      const task = Obj.make(Task.Task, { title: 'Ship feature' });
      expect(task.title).toBe('Ship feature');
    });
  });

  describe('Trigger', () => {
    test('Obj.make accepts feed trigger spec', async ({ expect }) => {
      const { db } = await builder.createDatabase({ types: [Trigger.Trigger, Feed.Feed] });
      const feed = db.add(Feed.make());
      const trigger = Obj.make(Trigger.Trigger, {
        enabled: false,
        spec: Trigger.specFeed(feed),
        input: { input: '{{event.item}}' },
        concurrency: 1,
      });
      expect(trigger.spec?.kind).toBe('feed');
      db.add(trigger);
    });
  });
});
