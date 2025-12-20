//
// Copyright 2025 DXOS.org
//

import { render, waitFor } from '@solidjs/testing-library';
import { createSignal, type JSX } from 'solid-js';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Obj, Query, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { EchoTestBuilder } from '@dxos/echo-db/testing';

import { useQuery } from './useQuery';

describe('useQuery', () => {
  let testBuilder: EchoTestBuilder;
  let db: any;

  beforeEach(async () => {
    testBuilder = new EchoTestBuilder();
    const result = await testBuilder.createDatabase();
    db = result.db;
  });

  afterEach(async () => {
    await testBuilder.close();
  });

  test('returns empty array when database is undefined', () => {
    let result: any[] | undefined;

    render(() => {
      const objects = useQuery(undefined, Filter.type(Type.Expando));
      result = objects();
      return <div>test</div> as JSX.Element;
    });

    expect(result).toEqual([]);
  });

  test('returns empty array when query matches no objects', async () => {
    let result: any[] | undefined;

    render(() => {
      const objects = useQuery(db, Filter.type(Type.Expando));
      result = objects();
      return <div>test</div> as JSX.Element;
    });

    await waitFor(() => {
      expect(result).toEqual([]);
    });
  });

  test('returns matching objects', async () => {
    // Add some objects to the database
    const obj1 = Obj.make(Type.Expando, { name: 'Alice' });
    const obj2 = Obj.make(Type.Expando, { name: 'Bob' });
    db.add(obj1);
    db.add(obj2);
    await db.flush({ indexes: true });

    let objectsAccessor: (() => any[]) | undefined;

    function TestComponent() {
      const objects = useQuery(db, Filter.type(Type.Expando));
      objectsAccessor = objects;
      return <div data-testid='count'>{objects().length}</div> as JSX.Element;
    }

    const { getByTestId } = render(() => <TestComponent />);

    await waitFor(
      () => {
        expect(getByTestId('count').textContent).toBe('2');
      },
      { timeout: 5000 },
    );

    // Get the actual results from the accessor
    const result = objectsAccessor?.() ?? [];
    const names = result.map((obj) => obj.name).sort();
    expect(names).toEqual(['Alice', 'Bob']);
  });

  test('updates when objects are added', async () => {
    let objectsAccessor: (() => any[]) | undefined;

    function TestComponent() {
      const objects = useQuery(db, Filter.type(Type.Expando));
      objectsAccessor = objects;
      return <div data-testid='count'>{objects().length}</div> as JSX.Element;
    }

    const { getByTestId } = render(() => <TestComponent />);

    await waitFor(
      () => {
        expect(getByTestId('count').textContent).toBe('0');
      },
      { timeout: 5000 },
    );

    // Add an object
    const obj = Obj.make(Type.Expando, { name: 'Charlie' });
    db.add(obj);
    await db.flush({ indexes: true });

    await waitFor(
      () => {
        expect(getByTestId('count').textContent).toBe('1');
      },
      { timeout: 5000 },
    );

    // Get the actual results from the accessor
    const result = objectsAccessor?.() ?? [];
    expect(result.length).toBe(1);
    expect(result[0]?.name).toBe('Charlie');
  });

  test('updates when objects are removed', async () => {
    // Add objects first
    const obj1 = Obj.make(Type.Expando, { name: 'Alice' });
    const obj2 = Obj.make(Type.Expando, { name: 'Bob' });
    db.add(obj1);
    db.add(obj2);
    await db.flush({ indexes: true });

    let objectsAccessor: (() => any[]) | undefined;

    function TestComponent() {
      const objects = useQuery(db, Filter.type(Type.Expando));
      objectsAccessor = objects;
      return <div data-testid='count'>{objects().length}</div> as JSX.Element;
    }

    const { getByTestId } = render(() => <TestComponent />);

    await waitFor(
      () => {
        expect(getByTestId('count').textContent).toBe('2');
      },
      { timeout: 5000 },
    );

    // Remove an object
    db.remove(obj1);
    await db.flush({ indexes: true });

    await waitFor(
      () => {
        expect(getByTestId('count').textContent).toBe('1');
      },
      { timeout: 5000 },
    );

    // Get the actual results from the accessor
    const result = objectsAccessor?.() ?? [];
    expect(result.length).toBe(1);
    expect(result[0]?.name).toBe('Bob');
  });

  test('accepts Filter directly', async () => {
    // Register schema first
    await db.graph.schemaRegistry.register([TestSchema.Person]);

    const obj = Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' });
    db.add(obj);
    await db.flush({ indexes: true });

    let objectsAccessor: (() => any[]) | undefined;

    function TestComponent() {
      const objects = useQuery(db, Filter.type(TestSchema.Person));
      objectsAccessor = objects;
      return <div data-testid='count'>{objects().length}</div> as JSX.Element;
    }

    const { getByTestId } = render(() => <TestComponent />);

    await waitFor(
      () => {
        expect(getByTestId('count').textContent).toBe('1');
      },
      { timeout: 5000 },
    );

    // Get the actual results from the accessor
    const result = objectsAccessor?.() ?? [];
    expect(result.length).toBe(1);
    expect(result[0]?.name).toBe('Test');
  });

  test('accepts Query directly', async () => {
    const obj = Obj.make(Type.Expando, { name: 'Test' });
    db.add(obj);
    await db.flush({ indexes: true });

    let objectsAccessor: (() => any[]) | undefined;

    function TestComponent() {
      const objects = useQuery(db, Query.select(Filter.type(Type.Expando)));
      objectsAccessor = objects;
      return <div data-testid='count'>{objects().length}</div> as JSX.Element;
    }

    const { getByTestId } = render(() => <TestComponent />);

    await waitFor(
      () => {
        expect(getByTestId('count').textContent).toBe('1');
      },
      { timeout: 5000 },
    );

    // Get the actual results from the accessor
    const result = objectsAccessor?.() ?? [];
    expect(result.length).toBe(1);
    expect(result[0]?.name).toBe('Test');
  });

  test('accepts reactive database accessor', async () => {
    const obj = Obj.make(Type.Expando, { name: 'Test' });
    db.add(obj);
    await db.flush({ indexes: true });

    let objectsAccessor: (() => any[]) | undefined;
    let dbAccessor: any = db;

    function TestComponent() {
      const objects = useQuery(() => dbAccessor, Filter.type(Type.Expando));
      objectsAccessor = objects;
      return <div data-testid='count'>{objects().length}</div> as JSX.Element;
    }

    const { getByTestId } = render(() => <TestComponent />);

    await waitFor(
      () => {
        expect(getByTestId('count').textContent).toBe('1');
      },
      { timeout: 5000 },
    );

    // Get the actual results from the accessor
    let result = objectsAccessor?.() ?? [];
    expect(result.length).toBe(1);

    // Change database to undefined
    dbAccessor = undefined;

    // Should keep previous value (no flickering)
    await new Promise((resolve) => setTimeout(resolve, 50));
    result = objectsAccessor?.() ?? [];
    expect(result.length).toBe(1);
  });

  test('accepts reactive query accessor', async () => {
    // Register schema first
    await db.graph.schemaRegistry.register([TestSchema.Person]);

    const obj1 = Obj.make(Type.Expando, { name: 'Test1' });
    const obj2 = Obj.make(TestSchema.Person, { name: 'Test2', username: 'test', email: 'test@example.com' });
    db.add(obj1);
    db.add(obj2);
    await db.flush({ indexes: true });

    let objectsAccessor: (() => any[]) | undefined;
    const [usePersonFilter, setUsePersonFilter] = createSignal(false);

    function TestComponent() {
      const objects = useQuery(db, () => (usePersonFilter() ? Filter.type(TestSchema.Person) : Filter.type(Type.Expando)));
      objectsAccessor = objects;
      return <div data-testid='count'>{objects().length}</div> as JSX.Element;
    }

    const { getByTestId } = render(() => <TestComponent />);

    await waitFor(
      () => {
        expect(getByTestId('count').textContent).toBe('1');
      },
      { timeout: 5000 },
    );

    // Get the actual results from the accessor
    let result = objectsAccessor?.() ?? [];
    expect(result[0]?.name).toBe('Test1');

    // Switch to person filter
    setUsePersonFilter(true);

    await waitFor(
      () => {
        expect(getByTestId('count').textContent).toBe('1');
      },
      { timeout: 5000 },
    );

    // Get the actual results from the accessor
    result = objectsAccessor?.() ?? [];
    expect(result.length).toBe(1);
    expect(result[0]?.name).toBe('Test2');
  });
});

