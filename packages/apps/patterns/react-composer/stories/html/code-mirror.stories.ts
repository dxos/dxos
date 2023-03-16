//
// Copyright 2023 DXOS.org
//

import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { StoryObj } from '@storybook/html';
import { basicSetup } from '@uiw/react-codemirror';
import { yCollab } from 'y-codemirror.next';

import { Trigger } from '@dxos/async';
import { Client, PublicKey, Text } from '@dxos/client';
import { joinCommonSpace, TestBuilder } from '@dxos/client-services/testing';
import { YText } from '@dxos/text-model';

import { ComposerDocument, schema } from '../../src/testing';

const testBuilder = new TestBuilder();

export default {
  title: 'CodeMirror'
};

const getText = (document?: ComposerDocument) => {
  const text = document?.content;
  if (text?.content instanceof YText) {
    return text.content;
  }
};

const createEditor = async (client: Client, spaceKey: PublicKey, editor: HTMLDivElement) => {
  const space = await client.echo.getSpace(spaceKey)!;
  const sync = new Trigger<YText>();
  const query = space.db.query(ComposerDocument.filter());
  query.subscribe((query) => {
    const text = getText(query.objects[0]);
    if (text) {
      console.log({ id: client.halo.identity!.identityKey.truncate(), text: text.toString() });
      sync.wake(text);
    }
  });
  const text = getText(query.objects[0]) ?? (await sync.wait());

  const state = EditorState.create({
    doc: text.toString(),
    extensions: [basicSetup(), markdown({ base: markdownLanguage }), yCollab(text, null)]
  });

  const _view = new EditorView({ state, parent: editor });

  // loremGenerator({ text: text.content });
};

const setupSpace = async (count: number) => {
  const clients = [...Array(count)].map(() => new Client({ services: testBuilder.createLocal() }));
  await Promise.all(clients.map((client) => client.initialize()));
  await Promise.all(clients.map((client) => client.halo.createIdentity()));
  clients.map((client) => client.echo.dbRouter.addSchema(schema));

  const space = await clients[0].echo.createSpace();
  const text = new Text('Hello, Storybook!');
  const document = new ComposerDocument({ content: text });
  await space.db.add(document);

  await joinCommonSpace(clients, space.key);

  return { clients, spaceKey: space.key };
};

const count = 2;
export const Default: StoryObj<{ client: Client; spaceKey: PublicKey }> = {
  render: ({ client, spaceKey }) => {
    const editor = document.createElement('div');
    editor.setAttribute('style', 'min-width: 0; flex: 1; padding: 1rem;');
    void createEditor(client, spaceKey, editor);
    return editor;
  },
  decorators: [
    (story) => {
      const container = document.createElement('div');
      container.setAttribute('style', 'display: flex; justify-content: space-evenly');
      void setupSpace(count).then(({ clients, spaceKey }) => {
        clients.forEach((client) => {
          // TODO(wittjosiah): According to the docs these types should be compatible.
          container.appendChild(story({ args: { client, spaceKey } }) as HTMLElement);
        });
      });
      return container;
    }
  ]
};
