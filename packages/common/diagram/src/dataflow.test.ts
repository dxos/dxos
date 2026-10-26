//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Diagnostics from './diagnostics.ts';
import { parse, toScene } from './dsl/parse.ts';

const ORDERS = `
diagram kind=dataflow
node Customer "Customer" role=external
node Place "Place order"
node Bill "Bill customer"
node Orders "Orders" role=store
node Bank "Bank" role=external
edge Customer -> Place "order details"
edge Place -> Orders "new order"
edge Orders -> Bill "open orders"
edge Bill -> Customer "invoice"
edge Bill -> Bank "payment request"
`;

describe('data-flow diagrams', () => {
  test('draws each role as its own shape and lays out without errors', ({ expect }) => {
    const { commands, problems } = parse(ORDERS);
    expect(problems).toEqual([]);
    const objects = toScene(commands).objects;
    const box = (id: string) => objects.find((object) => object.id === id)?.elements[0];
    expect(box('Place')).toMatchObject({ kind: 'ellipse', id: 'box', text: 'Place order' });
    expect(box('Customer')).toMatchObject({ kind: 'rect', corners: 'none', fill: 'solid' });
    expect(box('Orders')).toMatchObject({ kind: 'rect', corners: 'none', text: 'Orders' });
    expect(objects.find((object) => object.id === 'Orders')?.elements).toContainEqual(
      expect.objectContaining({ id: 'compartment', text: 'D1' }),
    );
    expect(Diagnostics.errors(Diagnostics.analyze(objects))).toEqual([]);
  });

  test('warns where data moves without a process, and about black holes, miracles and write-only stores', ({
    expect,
  }) => {
    const { problems } = parse(`
      diagram kind=dataflow
      node User role=external
      node Log role=store
      node Sink
      node Source
      edge User -> Log "event"
      edge User -> Sink "x"
      edge Source -> User "y"
    `);
    expect(problems.map(({ message }) => message)).toEqual([
      'Data flows from the external "User" to the store "Log" without a process; route it through one.',
      'The store "Log" is written but never read.',
      'The process "Sink" takes data but gives none (a black hole).',
      'The process "Source" gives data but takes none (a miracle).',
    ]);
  });

  test('roles belong to their diagram kind', ({ expect }) => {
    const { problems } = parse('node A role=store\nnode B role=actor');
    expect(problems.map(({ message }) => message)).toEqual([
      'role=store belongs in a dataflow diagram; declare `diagram kind=dataflow`.',
      'role=actor belongs in a sequence diagram; declare `diagram kind=sequence`.',
    ]);
  });
});
