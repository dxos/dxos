//
// Copyright 2026 DXOS.org
//

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as Schema from 'effect/Schema';
import React from 'react';
import { afterEach, describe, test, vi } from 'vitest';

import { Form } from '../Form.tsx';
import { type FormRootProps } from '../FormRoot.tsx';

const Settings = Schema.Struct({
  name: Schema.optional(Schema.String.annotate({ title: 'Name' })),
  spacing: Schema.optional(Schema.Number.annotate({ title: 'Spacing', default: 26 })),
  density: Schema.optional(
    Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 1 })).annotate({ title: 'Density', default: 0.6 }),
  ),
});

type Settings = Schema.Schema.Type<typeof Settings>;

const renderForm = (values: Settings, props: Partial<FormRootProps<Settings>> = {}) =>
  render(
    <Form.Root<Settings> schema={Settings} values={values} {...props}>
      <Form.Content>
        <Form.Fields />
      </Form.Content>
    </Form.Root>,
  );

describe('a field whose schema declares a default', () => {
  afterEach(() => cleanup());

  test('shows the default as its value while it has none, and its own value once it has one', ({ expect }) => {
    renderForm({ spacing: 40 });
    expect(screen.getByRole('spinbutton', { name: 'Spacing' })).toHaveValue('40');
    // A check on the number carries the annotation as the number itself does.
    expect(screen.getByRole('spinbutton', { name: 'Density' })).toHaveValue('0.6');
    // A field that declares none is empty.
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('');
  });

  test('is not written by being shown: a save carries only what was edited', ({ expect }) => {
    const onSave = vi.fn();
    renderForm({}, { autoSave: true, onSave });
    const spacing = screen.getByRole('spinbutton', { name: 'Spacing' });
    expect(spacing).toHaveValue('26');
    fireEvent.focus(spacing);
    fireEvent.blur(spacing);
    expect(onSave).not.toHaveBeenCalled();

    const name = screen.getByRole('textbox', { name: 'Name' });
    fireEvent.change(name, { target: { value: 'Ada' } });
    fireEvent.blur(name);
    expect(onSave).toHaveBeenCalled();
    expect(onSave.mock.lastCall?.[0]).toEqual({ name: 'Ada' });
  });
});
