//
// Copyright 2026 DXOS.org
//

import { EditorView } from '@codemirror/view';
import { cleanup, render, waitFor } from '@testing-library/react';
import * as Schema from 'effect/Schema';
import React from 'react';
import { afterEach, describe, test, vi } from 'vitest';

import { DXN, Format, Obj, Type } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { type DataExtensionsPresence } from '@dxos/ui-editor';

import { CollaborativeAnnotation } from '../../annotations.ts';
import { Form } from '../Form.tsx';
import { type FormRootProps } from '../FormRoot.tsx';

const Values = Schema.Struct({
  description: Schema.optional(
    Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Markdown), CollaborativeAnnotation.set(true)),
  ),
});

type Values = Schema.Schema.Type<typeof Values>;

const Item = Values.pipe(Type.makeObject(DXN.make('com.example.test.item', '0.1.0')));

const renderForm = (values: Values, props: Partial<FormRootProps<Values>>) => {
  const { container } = render(
    <Form.Root<Values> schema={Values} values={values} {...props}>
      <Form.Fields />
    </Form.Root>,
  );

  return () => {
    const element = container.querySelector<HTMLElement>('.cm-editor');
    return element ? EditorView.findFromDOM(element) : null;
  };
};

/** Records the channels a field's awareness posts on. */
const createMessenger = (): { messenger: NonNullable<DataExtensionsPresence['messenger']>; channels: string[] } => {
  const channels: string[] = [];
  return {
    channels,
    messenger: {
      listen: () => Object.assign(() => {}, { ready: Promise.resolve() }),
      postMessage: async (channel) => {
        channels.push(channel);
      },
    },
  };
};

describe('MarkdownField', () => {
  afterEach(() => cleanup());

  test("a collaborative string field edits the form's object in place", async ({ expect }) => {
    const item = Obj.make(Item, { description: 'Hello' });
    const onValuesChanged = vi.fn();
    const getView = renderForm({ description: 'Hello' }, { object: item, onValuesChanged });
    await waitFor(() => expect(getView()?.state.doc.toString()).toBe('Hello'));

    const view = getView()!;
    view.dispatch({ changes: { from: view.state.doc.length, insert: ' world' } });
    expect(item.description).toBe('Hello world');
    expect(onValuesChanged).not.toHaveBeenCalled();

    Doc.updateText(item, ['description'], 'Hi world');
    await waitFor(() => expect(view.state.doc.toString()).toBe('Hi world'));
  });

  test("a string field's awareness uses a channel of its own", async ({ expect }) => {
    const item = Obj.make(Item, { description: '' });
    const { messenger, channels } = createMessenger();
    renderForm(
      { description: '' },
      { object: item, collaboration: { messenger, identity: { identityKey: '0123abcd', displayName: 'Peer' } } },
    );

    await waitFor(() => expect(channels).toContain(`awareness.${Obj.getURI(item)}.description`));
  });
});
