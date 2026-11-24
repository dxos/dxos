//
// Copyright 2026 DXOS.org
//

import { cleanup, render, screen } from '@testing-library/react';
import * as Schema from 'effect/Schema';
import React from 'react';
import { afterEach, describe, test } from 'vitest';

import { Form } from './Form.tsx';
import { useFormDispatch } from './FormDispatchContext.ts';

const Person = Schema.Struct({
  name: Schema.optional(Schema.String.annotate({ title: 'Name' })),
});

/** Renders fields the way `ArrayField` and `InlineRefField` do: through the dispatcher from context. */
const DispatchedFields = () => {
  const { FormFields } = useFormDispatch('DispatchedFields');
  return <FormFields />;
};

describe('Form.Root', () => {
  afterEach(() => cleanup());

  test('provides the dispatcher to a field rendered with no Form.Fields above it', ({ expect }) => {
    render(
      <Form.Root schema={Person} values={{ name: 'Ada' }}>
        <DispatchedFields />
      </Form.Root>,
    );
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Ada');
  });
});
