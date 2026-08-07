//
// Copyright 2026 DXOS.org
//

import { cleanup, render, screen } from '@testing-library/react';
import * as Schema from 'effect/Schema';
import React, { type PropsWithChildren } from 'react';
import { afterEach, describe, test } from 'vitest';

import { Annotation } from '@dxos/echo';
import { ThemeProvider, Tooltip, defaultTx } from '@dxos/react-ui';

import { translations } from '#translations';

import { Form } from '../Form';

const Wrapper = ({ children }: PropsWithChildren) => (
  <ThemeProvider tx={defaultTx} resourceExtensions={translations}>
    <Tooltip.Provider delayDuration={0}>{children}</Tooltip.Provider>
  </ThemeProvider>
);

const renderField = (field: Schema.Schema<string, string>) =>
  render(
    <Form.Root schema={Schema.Struct({ handle: Schema.optional(field) })}>
      <Form.FieldSet />
    </Form.Root>,
    { wrapper: Wrapper },
  );

describe('FormField — placeholder resolution', () => {
  afterEach(() => {
    cleanup();
  });

  test('uses FormPlaceholderAnnotation for the input hint and keeps the description on the label', ({ expect }) => {
    renderField(
      Schema.String.pipe(
        Annotation.FormPlaceholderAnnotation.set('dxos.org'),
        Schema.annotations({ title: 'Handle', description: 'The atproto handle to publish under.' }),
      ),
    );

    expect(screen.getByPlaceholderText('dxos.org')).toBeInTheDocument();
    // The description documents the field via the label affordance; it is not ghost text.
    expect(screen.queryByPlaceholderText('The atproto handle to publish under.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Description' })).toBeInTheDocument();
  });

  test('falls back to the label, not the description, when no placeholder is set', ({ expect }) => {
    renderField(Schema.String.annotations({ title: 'Handle', description: 'The atproto handle to publish under.' }));

    expect(screen.getByPlaceholderText('Handle')).toBeInTheDocument();
  });

  test('an explicit placeholder wins over examples', ({ expect }) => {
    renderField(
      Schema.String.pipe(
        Annotation.FormPlaceholderAnnotation.set('dxos.org'),
        Schema.annotations({ title: 'Handle', examples: ['alice.bsky.social'] }),
      ),
    );

    expect(screen.getByPlaceholderText('dxos.org')).toBeInTheDocument();
  });

  test('examples still drive the placeholder when no placeholder is set', ({ expect }) => {
    renderField(Schema.String.annotations({ title: 'Handle', examples: ['alice.bsky.social'] }));

    expect(screen.getByPlaceholderText('Example: alice.bsky.social')).toBeInTheDocument();
  });
});
