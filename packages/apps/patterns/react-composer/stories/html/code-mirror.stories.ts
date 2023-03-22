//
// Copyright 2023 DXOS.org
//

import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { StoryObj } from '@storybook/html';
import { basicSetup } from 'codemirror';
import { yCollab } from 'y-codemirror.next';

import { EventSubscriptions } from '@dxos/async';
import { Client, Identity, PublicKey, Space, Text } from '@dxos/client';
import { joinCommonSpace, TestBuilder } from '@dxos/client-services/testing';
import { textGenerator } from '@dxos/react-client/testing';
import { YText } from '@dxos/text-model';
import { humanize } from '@dxos/util';

import { ComposerDocument, schema } from '../../src/testing';
import { cursorColor, SpaceProvider } from '../../src/yjs';

export default {
  title: 'CodeMirror'
};

const testBuilder = new TestBuilder();
const views: Record<number, EditorView> = {};
const subscriptions = new EventSubscriptions();

const updateEditor = async (id: number, editor: HTMLDivElement, identity: Identity, space: Space, text: Text) => {
  const doc = text.doc;
  const ytext = text.content;
  if (!(ytext instanceof YText) || !doc) {
    return;
  }

  const { awareness } = new SpaceProvider({ space, doc });
  awareness.setLocalStateField('user', {
    name: identity.profile?.displayName ?? humanize(identity.identityKey),
    // TODO(wittjosiah): Pick colours from theme based on identity key.
    color: cursorColor.color,
    colorLight: cursorColor.light
  });

  const state = EditorState.create({
    doc: ytext.toString(),
    extensions: [basicSetup, markdown({ base: markdownLanguage }), yCollab(ytext, awareness)]
  });

  const view = views[id];
  if (view) {
    view.setState(state);
  } else {
    views[id] = new EditorView({ state, parent: editor });
  }

  if (id === 0) {
    subscriptions.clear();
    subscriptions.add(textGenerator({ text: ytext }));
  }
};

const setupEditor = async (id: number, client: Client, spaceKey: PublicKey, editor: HTMLDivElement) => {
  const space = await client.getSpace(spaceKey)!;
  const query = space.db.query(ComposerDocument.filter());
  query.subscribe(({ objects }) => {
    const text = objects[0]?.content;
    text && updateEditor(id, editor, client.halo.identity.get()!, space, text);
  });

  const text = query.objects[0]?.content;
  text && updateEditor(id, editor, client.halo.identity.get()!, space, text);
};

const setupSpace = async (count: number) => {
  const clients = [...Array(count)].map(() => new Client({ services: testBuilder.createLocal() }));
  await Promise.all(clients.map((client) => client.initialize()));
  await Promise.all(clients.map((client) => client.halo.createIdentity()));
  clients.map((client) => client.dbRouter.addSchema(schema));

  const space = await clients[0].createSpace();
  const text = new Text('Hello, Storybook!');
  const document = new ComposerDocument({ content: text });
  await space.db.add(document);

  await joinCommonSpace(clients, space.key);

  return { clients, spaceKey: space.key };
};

const count = 2;
export const Default: StoryObj<{ id: number; client: Client; spaceKey: PublicKey }> = {
  render: ({ id, client, spaceKey }) => {
    const editor = document.createElement('div');
    editor.setAttribute('style', 'min-width: 0; flex: 1; padding: 1rem;');
    void setupEditor(id, client, spaceKey, editor);
    return editor;
  },
  decorators: [
    (story) => {
      const container = document.createElement('div');
      container.setAttribute('style', 'display: flex; justify-content: space-evenly');
      void setupSpace(count).then(({ clients, spaceKey }) => {
        clients.forEach((client, id) => {
          // TODO(wittjosiah): According to the docs these types should be compatible.
          container.appendChild(story({ args: { id, client, spaceKey } }) as HTMLElement);
        });
      });
      return container;
    }
  ]
};
