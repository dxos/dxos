//
// Copyright 2023 DXOS.org
//

import { Registry, Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';
import { describe, expect, onTestFinished, test } from 'vitest';

import { registerSignalsRuntime } from '@dxos/echo-signals';
import { getDebugName } from '@dxos/util';

import { ROOT_ID } from './graph';
import { createExtension, GraphBuilder } from './graph-builder';

registerSignalsRuntime();

const exampleId = (id: number) => `dx:test:${id}`;
const EXAMPLE_ID = exampleId(1);
const EXAMPLE_TYPE = 'dxos.org/type/example';

describe('repro', () => {
  test.only('failing test', () => {
    const registry = Registry.make();
    const builder = new GraphBuilder({ registry });
    const name = Rx.make('default').pipe(Rx.keepAlive, Rx.withLabel('name'));
    const sub = Rx.make('default').pipe(Rx.keepAlive, Rx.withLabel('sub'));

    builder.addExtension([
      createExtension({
        id: 'root',
        connector: (key) =>
          Rx.make((get) => {
            const node = get(key);
            const result = pipe(
              node,
              Option.flatMap((node) => (node.id === 'root' ? Option.some(get(name)) : Option.none())),
              Option.filter((name) => name !== 'removed'),
              Option.map((name) => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: name }]),
              Option.getOrElse(() => []),
            );
            console.log('!!root', getDebugName(node), getDebugName(result), node.pipe(Option.getOrNull)?.id);
            return result;
          }),
      }),
      createExtension({
        id: 'connector1',
        connector: (key) =>
          Rx.make((get) => {
            const node = get(key);
            const result = pipe(
              node,
              Option.flatMap((node) => (node.id === EXAMPLE_ID ? Option.some(get(sub)) : Option.none())),
              Option.map((sub) => [{ id: exampleId(2), type: EXAMPLE_TYPE, data: sub }]),
              Option.getOrElse(() => []),
            );
            console.log('!!connector1', getDebugName(node), getDebugName(result), node.pipe(Option.getOrNull)?.id);
            return result;
          }),
      }),
      createExtension({
        id: 'connector2',
        connector: (key) =>
          Rx.make((get) => {
            const node = get(key);
            const result = pipe(
              node,
              Option.flatMap((node) => (node.id === EXAMPLE_ID ? Option.some(node.data) : Option.none())),
              Option.map((data) => {
                console.log('??connector2', data);
                return [{ id: exampleId(3), type: EXAMPLE_TYPE, data }];
              }),
              Option.getOrElse(() => []),
            );
            console.log('!!connector2', getDebugName(node), getDebugName(result), node.pipe(Option.getOrNull)?.id);
            return result;
          }),
      }),
    ]);

    const graph = builder.graph;

    let parentCount = 0;
    const parentCancel = registry.subscribe(graph.node(EXAMPLE_ID), (_) => {
      // console.log('parent', _);
      parentCount++;
    });
    onTestFinished(() => parentCancel());

    let independentCount = 0;
    const independentCancel = registry.subscribe(graph.node(exampleId(2)), (_) => {
      // console.log('independent', _);
      independentCount++;
    });
    onTestFinished(() => independentCancel());

    let dependentCount = 0;
    const dependentCancel = registry.subscribe(graph.node(exampleId(3)), (_) => {
      // console.log('dependent', _);
      dependentCount++;
    });
    onTestFinished(() => dependentCancel());

    console.log('\nstart\n');

    graph.expand(ROOT_ID);
    graph.expand(EXAMPLE_ID);
    expect(parentCount).to.equal(1);
    expect(independentCount).to.equal(1);
    expect(dependentCount).to.equal(1);

    console.log('\nsub one\n');

    registry.set(sub, 'one');
    expect(parentCount).to.equal(1);
    expect(independentCount).to.equal(2);
    expect(dependentCount).to.equal(1);

    console.log('\nname a\n');

    registry.set(name, 'a');
    expect(parentCount).to.equal(2);
    expect(independentCount).to.equal(2);
    expect(dependentCount).to.equal(2);

    console.log('\nsub two\n');

    registry.set(sub, 'two');
    expect(parentCount).to.equal(2);
    expect(independentCount).to.equal(3);
    expect(dependentCount).to.equal(2);

    console.log('\nname b\n');

    // TODO(wittjosiah): Issues seems to be that the `connectors` rx value is not being re-evaluated when the name changes at this point for some reason.
    registry.set(name, 'b');
    expect(parentCount).to.equal(3);
    expect(independentCount).to.equal(3);
    expect(dependentCount).to.equal(3); // Current: 2

    // class N {
    //   parents: N[];
    //   rx: any;
    //   lifetime: any;
    // }

    // const nodes = (registry as any).nodes as Map<Rx.Rx<any>, N>;
    // const getLabel = (n: N) => n.rx.label[0];
    // const parents = Array.from(nodes.values()).map(
    //   (n) => [getLabel(n), n.parents.map(getLabel)] as [string, string[]],
    // );
    // console.log(parents);

    // console.log('\nsub three\n');

    // registry.set(sub, 'three');
    // expect(parentCount).to.equal(3);
    // expect(independentCount).to.equal(4); // current: 3
    // expect(dependentCount).to.equal(3); // current: 2
  });
});
