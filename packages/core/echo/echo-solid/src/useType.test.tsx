//
// Copyright 2025 DXOS.org
//

import { render, waitFor } from '@solidjs/testing-library';
import { type JSX, createMemo } from 'solid-js';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { TestSchema } from '@dxos/echo/testing';

import { useSchema } from './useType';

describe('useSchema', () => {
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

  test('returns undefined when database is undefined', () => {
    let result: any;

    render(() => {
      const schema = useSchema(undefined, 'dxos.test.Person');
      result = schema();
      return (<div>test</div>) as JSX.Element;
    });

    expect(result).toBeUndefined();
  });

  test('returns undefined when typename is undefined', () => {
    let result: any;

    render(() => {
      const schema = useSchema(db, undefined);
      result = schema();
      return (<div>test</div>) as JSX.Element;
    });

    expect(result).toBeUndefined();
  });

  test('returns undefined when schema does not exist', async () => {
    let result: any;

    render(() => {
      const schema = useSchema(db, 'dxos.test.NonExistent');
      result = schema();
      return (<div>test</div>) as JSX.Element;
    });

    await waitFor(() => {
      expect(result).toBeUndefined();
    });
  });

  test('returns schema when it exists', async () => {
    // Register a schema to the database
    const [registeredSchema] = await db.registry.register([TestSchema.Person]);
    await db.flush({ indexes: true });

    let schemaAccessor: (() => any) | undefined;

    function TestComponent() {
      const schema = useSchema(db, Type.getTypename(registeredSchema)!);
      schemaAccessor = schema;
      const t = createMemo(() => {
        const s = schema();
        return s ? Type.getTypename(s) : undefined;
      });
      return (<div data-testid='typename'>{t() || 'undefined'}</div>) as JSX.Element;
    }

    const { getByTestId } = render(() => <TestComponent />);

    await waitFor(() => {
      expect(getByTestId('typename').textContent).toBe(Type.getTypename(registeredSchema)!);
    });

    // Get the actual result from the accessor
    const result = schemaAccessor?.();
    expect(result).toBeDefined();
    expect(Type.getTypename(result!)).toBe(Type.getTypename(registeredSchema)!);
  });

  test.skip('updates when schema is added', async () => {
    // TODO: This test is skipped because runtime schema registry is not reactive to newly registered schemas.
    // The query reads from db.graph.registry.types (shared registry), but when a schema is registered
    // via db.registry.register(), the runtime registry query subscription doesn't fire reactively.
    let schemaAccessor: (() => any) | undefined;
    const typename = 'com.example.type.person';

    function TestComponent() {
      const schema = useSchema(db, typename);
      schemaAccessor = schema;
      const t = createMemo(() => {
        const s = schema();
        return s ? Type.getTypename(s) : undefined;
      });
      return (<div data-testid='typename'>{t() || 'undefined'}</div>) as JSX.Element;
    }

    const { getByTestId } = render(() => <TestComponent />);

    await waitFor(() => {
      expect(getByTestId('typename').textContent).toBe('undefined');
    });

    // Register the schema
    const [registeredSchema] = await db.registry.register([TestSchema.Person]);
    await db.flush({ indexes: true });

    // The schema registry query should pick up the new schema
    // db.graph.registry.types should include the newly registered schema
    await waitFor(() => {
      expect(getByTestId('typename').textContent).toBe(Type.getTypename(registeredSchema)!);
    });

    // Get the actual result from the accessor
    const result = schemaAccessor?.();
    expect(result).toBeDefined();
    expect(Type.getTypename(result!)).toBe(Type.getTypename(registeredSchema)!);
  });

  test('accepts reactive database accessor', async () => {
    const [registeredSchema] = await db.registry.register([TestSchema.Person]);

    let schemaAccessor: (() => any) | undefined;
    let dbAccessor: any = db;

    function TestComponent() {
      const schema = useSchema(() => dbAccessor, Type.getTypename(registeredSchema)!);
      schemaAccessor = schema;
      const t = createMemo(() => {
        const s = schema();
        return s ? Type.getTypename(s) : undefined;
      });
      return (<div data-testid='typename'>{t() || 'undefined'}</div>) as JSX.Element;
    }

    const { getByTestId } = render(() => <TestComponent />);

    await waitFor(() => {
      expect(getByTestId('typename').textContent).toBe(Type.getTypename(registeredSchema)!);
    });

    // Get the actual result from the accessor
    let result = schemaAccessor?.();
    expect(result).toBeDefined();

    // Change database to undefined
    dbAccessor = undefined;

    // Should keep previous value (no flickering)
    result = schemaAccessor?.();
    expect(result).toBeDefined();
  });

  test('accepts reactive typename accessor', async () => {
    const [registeredSchema] = await db.registry.register([TestSchema.Person]);

    let schemaAccessor: (() => any) | undefined;
    let typename: string | undefined = Type.getTypename(registeredSchema)!;

    function TestComponent() {
      const schema = useSchema(db, () => typename);
      schemaAccessor = schema;
      const t = createMemo(() => {
        const s = schema();
        return s ? Type.getTypename(s) : undefined;
      });
      return (<div data-testid='typename'>{t() || 'undefined'}</div>) as JSX.Element;
    }

    const { getByTestId } = render(() => <TestComponent />);

    await waitFor(() => {
      expect(getByTestId('typename').textContent).toBe(Type.getTypename(registeredSchema)!);
    });

    // Get the actual result from the accessor
    let result = schemaAccessor?.();
    expect(result).toBeDefined();
    expect(Type.getTypename(result!)).toBe(Type.getTypename(registeredSchema)!);

    // Change typename
    typename = undefined;

    await waitFor(() => {
      // Should keep previous value when typename becomes undefined
      expect(getByTestId('typename').textContent).toBe(Type.getTypename(registeredSchema)!);
    });
    result = schemaAccessor?.();
    expect(result).toBeDefined();
  });
});
