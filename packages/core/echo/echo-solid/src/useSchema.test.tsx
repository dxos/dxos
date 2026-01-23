//
// Copyright 2025 DXOS.org
//

import { render, waitFor } from '@solidjs/testing-library';
import { type JSX, createMemo } from 'solid-js';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { EchoTestBuilder } from '@dxos/echo-db/testing';

import { useSchema } from './useSchema';

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
    const [registeredSchema] = await db.schemaRegistry.register([TestSchema.Person]);
    await db.flush({ indexes: true });

    let schemaAccessor: (() => any) | undefined;

    function TestComponent() {
      const schema = useSchema(db, registeredSchema.typename);
      schemaAccessor = schema;
      const t = createMemo(() => {
        const s = schema();
        return s ? Type.getTypename(s) : undefined;
      });
      return (<div data-testid='typename'>{t() || 'undefined'}</div>) as JSX.Element;
    }

    const { getByTestId } = render(() => <TestComponent />);

    await waitFor(() => {
      expect(getByTestId('typename').textContent).toBe(registeredSchema.typename);
    });

    // Get the actual result from the accessor
    const result = schemaAccessor?.();
    expect(result).toBeDefined();
    expect(result?.typename).toBe(registeredSchema.typename);
  });

  test.skip('updates when schema is added', async () => {
    // TODO: This test is skipped because runtime schema registry is not reactive to newly registered schemas.
    // The query reads from db.graph.schemaRegistry.schemas (runtime registry), but when a schema is registered
    // via db.schemaRegistry.register(), it's added to the database registry, not the runtime registry.
    // The runtime registry query subscription doesn't fire when schemas are registered.
    // See: packages/core/echo/echo-db/src/proxy-db/runtime-schema-registry.ts:57
    let schemaAccessor: (() => any) | undefined;
    const typename = 'example.com/type/Person';

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
    const [registeredSchema] = await db.schemaRegistry.register([TestSchema.Person]);
    await db.flush({ indexes: true });

    // The schema registry query should pick up the new schema
    // It reads from db.graph.schemaRegistry.schemas which should include the newly registered schema
    await waitFor(() => {
      expect(getByTestId('typename').textContent).toBe(registeredSchema.typename);
    });

    // Get the actual result from the accessor
    const result = schemaAccessor?.();
    expect(result).toBeDefined();
    expect(result?.typename).toBe(registeredSchema.typename);
  });

  test('accepts reactive database accessor', async () => {
    const [registeredSchema] = await db.schemaRegistry.register([TestSchema.Person]);

    let schemaAccessor: (() => any) | undefined;
    let dbAccessor: any = db;

    function TestComponent() {
      const schema = useSchema(() => dbAccessor, registeredSchema.typename);
      schemaAccessor = schema;
      const t = createMemo(() => {
        const s = schema();
        return s ? Type.getTypename(s) : undefined;
      });
      return (<div data-testid='typename'>{t() || 'undefined'}</div>) as JSX.Element;
    }

    const { getByTestId } = render(() => <TestComponent />);

    await waitFor(() => {
      expect(getByTestId('typename').textContent).toBe(registeredSchema.typename);
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
    const [registeredSchema] = await db.schemaRegistry.register([TestSchema.Person]);

    let schemaAccessor: (() => any) | undefined;
    let typename: string | undefined = registeredSchema.typename;

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
      expect(getByTestId('typename').textContent).toBe(registeredSchema.typename);
    });

    // Get the actual result from the accessor
    let result = schemaAccessor?.();
    expect(result).toBeDefined();
    expect(result?.typename).toBe(registeredSchema.typename);

    // Change typename
    typename = undefined;

    await waitFor(() => {
      // Should keep previous value when typename becomes undefined
      expect(getByTestId('typename').textContent).toBe(registeredSchema.typename);
    });
    result = schemaAccessor?.();
    expect(result).toBeDefined();
  });
});
