//
// Copyright 2026 DXOS.org
//

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import * as Schema from 'effect/Schema';
import React from 'react';
import { afterEach, describe, test, vi } from 'vitest';

import { VectorAnnotationId } from '@dxos/ui-types';

import { Form } from '../Form.tsx';
import { type FormRootProps } from '../FormRoot.tsx';

const Vec3 = Schema.Struct({ x: Schema.Number, y: Schema.Number, z: Schema.Number }).annotate({
  [VectorAnnotationId]: true,
});

const Size2 = Schema.Struct({ width: Schema.Number, height: Schema.Number }).annotate({ [VectorAnnotationId]: true });

const Item = Schema.Struct({
  position: Vec3.annotate({ title: 'Position' }),
  size: Schema.optional(Size2),
});

type Item = Schema.Schema.Type<typeof Item>;

const renderForm = (values: Item, props: Partial<FormRootProps<Item>> = {}) =>
  render(
    <Form.Root<Item> schema={Item} values={values} {...props}>
      <Form.Content>
        <Form.Fields />
      </Form.Content>
    </Form.Root>,
  );

describe('VectorField', () => {
  afterEach(() => cleanup());

  test('stacks one input per axis, its letter a start adornment inside the input', ({ expect }) => {
    renderForm({ position: { x: 0, y: 1, z: 0 }, size: { width: 10, height: 20 } });
    const position = screen.getByRole('group', { name: 'Position' });
    expect(
      within(position)
        .getAllByRole('spinbutton')
        .map((input) => input.getAttribute('aria-label')),
    ).toEqual(['x', 'y', 'z']);
    expect(within(position).getByRole('spinbutton', { name: 'y' })).toHaveValue('1');
    const size = screen.getByRole('group', { name: 'Size' });
    expect(
      within(size)
        .getAllByRole('spinbutton')
        .map((input) => input.getAttribute('aria-label')),
    ).toEqual(['x', 'y']);
    // The letter sits in the input's start adornment, not in a label column beside it.
    const zInput = within(position).getByRole('spinbutton', { name: 'z' });
    expect(zInput.closest('[data-part="control"]')?.querySelector('[data-part="start"]')?.textContent).toContain('z');
    expect(within(size).queryByText('w')).toBeNull();
  });

  test('editing y writes only position.y, and commits on blur', async ({ expect }) => {
    const onValuesChanged = vi.fn();
    const onSave = vi.fn();
    renderForm({ position: { x: 0, y: 1, z: 0 } }, { commitOn: 'blur', autoSave: true, onValuesChanged, onSave });
    const y = within(screen.getByRole('group', { name: 'Position' })).getByRole('spinbutton', { name: 'y' });
    // Ark reports each change in a microtask, so every event is awaited before the next one reads the edit.
    await act(async () => fireEvent.focusIn(y));
    await act(async () => fireEvent.input(y, { target: { value: '5' } }));
    expect(y).toHaveValue('5');
    expect(onValuesChanged).not.toHaveBeenCalled();

    await act(async () => fireEvent.focusOut(y));
    expect(onValuesChanged).toHaveBeenCalledTimes(1);
    const [values, meta] = onValuesChanged.mock.calls[0];
    expect(meta.changed).toEqual({ 'position.y': true });
    expect(values.position).toEqual({ x: 0, y: 5, z: 0 });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].position).toEqual({ x: 0, y: 5, z: 0 });
  });

  test('a read-only form disables every axis', ({ expect }) => {
    renderForm({ position: { x: 0, y: 1, z: 0 } }, { readonly: true });
    const inputs = within(screen.getByRole('group', { name: 'Position' })).getAllByRole('spinbutton');
    expect(inputs).toHaveLength(3);
    inputs.forEach((input) => expect(input).toBeDisabled());
  });
});
