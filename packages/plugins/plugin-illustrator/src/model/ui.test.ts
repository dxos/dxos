//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Ui from './ui';

const Address = Schema.Struct({
  street: Schema.String,
  city: Schema.String,
});

const Task = Schema.Struct({
  title: Schema.String,
  done: Schema.Boolean,
});

const Contact = Schema.Struct({
  name: Schema.String,
  active: Schema.Boolean,
  role: Schema.Literals(['admin', 'member', 'guest']),
  address: Address,
  emails: Schema.Array(Schema.String),
  tasks: Schema.Array(Task),
}).annotate({ title: 'Contact' });

describe('Ui.fromSchema', () => {
  test('classifies controls and recurses into objects and arrays', ({ expect }) => {
    const form = Ui.fromSchema(Contact);
    // The schema title is container chrome, never part of the form itself.
    expect(Ui.schemaTitle(Contact)).toBe('Contact');
    expect(form.children.map((child) => child.kind)).toEqual([
      'control', // name
      'control', // active
      'control', // role
      'group', // address
      'array', // emails
      'array', // tasks
    ]);

    const [name, active, role, address, emails, tasks] = form.children;
    expect(name).toMatchObject({ control: 'input', path: 'name' });
    expect(active).toMatchObject({ control: 'checkbox', path: 'active' });
    expect(role).toMatchObject({ control: 'select', path: 'role' });

    expect(address.kind).toBe('group');
    if (address.kind === 'group') {
      expect(address.children.map((child) => child.kind === 'control' && child.path)).toEqual([
        'address.street',
        'address.city',
      ]);
    }

    expect(emails.kind).toBe('array');
    if (emails.kind === 'array') {
      expect(emails.item).toMatchObject({ kind: 'control', control: 'input', path: 'emails[]' });
    }

    expect(tasks.kind).toBe('array');
    if (tasks.kind === 'array') {
      expect(tasks.item.kind).toBe('group');
    }
  });

  test('depth cap degrades nested structure to a control', ({ expect }) => {
    const form = Ui.fromSchema(Contact, { maxDepth: 1 });
    const address = form.children.find((child) => child.path === 'address');
    // Depth 1 spends the budget on the property itself, so its nested fields collapse.
    expect(address?.kind).toBe('group');
    if (address?.kind === 'group') {
      for (const child of address.children) {
        expect(child.kind).toBe('control');
      }
    }
  });
});

describe('Ui.renderAscii', () => {
  test('renders the low-fidelity form', ({ expect }) => {
    const ascii = Ui.renderAscii(Ui.fromSchema(Contact));
    expect(ascii).toBe(
      [
        'name',
        '[__________]',
        '',
        'active',
        '[ ]',
        '',
        'role',
        '[________ v]',
        '',
        'address',
        '  street',
        '  [__________]',
        '',
        '  city',
        '  [__________]',
        '',
        'emails [+]',
        '  [__________]',
        '',
        'tasks [+]',
        '  title',
        '  [__________]',
        '',
        '  done',
        '  [ ]',
      ].join('\n'),
    );
  });

  test('containers draw boxes', ({ expect }) => {
    const deck = Ui.deckOf(Ui.fromSchema(Address), 'Address');
    const ascii = Ui.renderAscii(deck);
    const lines = ascii.split('\n');
    expect(lines[0]).toMatch(/^\+- Address -+\+$/);
    expect(lines.at(-1)).toMatch(/^\+-+\+$/);
    expect(ascii).toContain('[__________]');
  });
});

describe('Ui.compile', () => {
  test('emits one addressable object per control plus container frames', ({ expect }) => {
    const commands = Ui.compile(Ui.deckOf(Ui.fromSchema(Contact)));
    const ids = commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object.id] : []));

    expect(ids).toEqual(expect.arrayContaining(['deck', 'panel', 'name', 'active', 'role', 'address.street']));
    expect(ids).toEqual(expect.arrayContaining(['emails.add', 'tasks.add']));

    for (const command of commands) {
      if (command.op === 'upsert-object') {
        expect(Number.isFinite(command.object.origin!.x)).toBe(true);
        expect(Number.isFinite(command.object.origin!.y)).toBe(true);
      }
    }
  });

  test('scale and origin place the drawing on the canvas', ({ expect }) => {
    const commands = Ui.compile(Ui.fromSchema(Address), { origin: { x: 100, y: 50 }, scale: 2 });
    for (const command of commands) {
      if (command.op === 'upsert-object') {
        expect(command.object.scale).toBe(2);
        expect(command.object.origin!.x).toBeGreaterThanOrEqual(100);
        expect(command.object.origin!.y).toBeGreaterThanOrEqual(50);
      }
    }
  });
});
