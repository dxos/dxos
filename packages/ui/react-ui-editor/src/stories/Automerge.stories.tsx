//
// Copyright 2023 DXOS.org
//

import { Repo, initSubduction } from '@automerge/automerge-repo';
import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';
import { expect, waitFor } from 'storybook/test';

import { Obj, Query, Ref } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { TestSchema } from '@dxos/echo/testing';
import { type Messenger } from '@dxos/protocols';
import { useQuery, useResolveRef, useSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useClientStory, withMultiClientProvider } from '@dxos/react-client/testing';
import { useThemeContext } from '@dxos/react-ui';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import {
  type DataExtensionsIdentity,
  createBasicExtensions,
  createDataExtensions,
  createThemeExtensions,
} from '@dxos/ui-editor';

import { translations } from '#translations';

import { useTextEditor } from '../hooks';

const initialContent = 'Hello world!';

type TestObject = {
  text: string;
};

type EditorProps = {
  source: Doc.Accessor;
  messenger?: Messenger;
  identity?: DataExtensionsIdentity;
  autoFocus?: boolean;
};

const Editor = ({ source, messenger, identity, autoFocus }: EditorProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(
    () => ({
      autoFocus,
      initialValue: Doc.getValue(source),
      extensions: [
        createBasicExtensions({ placeholder: 'Type here...', search: true }),
        createThemeExtensions({ themeMode, slots: { scroller: { className: 'p-2' } } }),
        createDataExtensions({ id: 'test', text: source, messenger, identity }),
      ],
    }),
    [source, themeMode],
  );

  return <div ref={parentRef} className='flex w-full' />;
};

const DefaultStory = () => {
  const [object1, setObject1] = useState<Doc.Accessor<TestObject>>();
  const [object2, setObject2] = useState<Doc.Accessor<TestObject>>();

  useEffect(() => {
    queueMicrotask(async () => {
      // Subduction-fork `Repo` constructs a `MemorySigner` internally; WASM must be
      // initialized first or the constructor throws `'set_subduction_logger' of undefined`.
      await initSubduction();
      const repo1 = new Repo({ network: [new BroadcastChannelNetworkAdapter()] });
      const repo2 = new Repo({ network: [new BroadcastChannelNetworkAdapter()] });

      const object1 = repo1.create<TestObject>();
      object1.change((doc: TestObject) => {
        doc.text = initialContent;
      });

      const object2 = await repo2.find<TestObject>(object1.url);
      await object2.whenReady();

      setObject1({ handle: object1, path: ['text'] });
      setObject2({ handle: object2, path: ['text'] });
    });
  }, []);

  if (!object1 || !object2) {
    return <Loading data={{ object1: !!object1, object2: !!object2 }} />;
  }

  return (
    <div className='h-full w-full grid grid-cols-2 gap-4'>
      <Editor source={object1} autoFocus />
      <Editor source={object2} />
    </div>
  );
};

const EchoStory = () => {
  const { spaceId, index } = useClientStory();
  const identity = useIdentity();
  const space = useSpace(spaceId);
  const objects = useQuery(space?.db, Query.type(TestSchema.Expando, { type: 'test' }));
  // NOTE: `objects[0]?.content.target` is not reactive to the ref loading; `useResolveRef`
  // subscribes to the ref's load event so the editor mounts once the target arrives.
  const content = useResolveRef(objects[0]?.content);

  const [source, setSource] = useState<Doc.Accessor>();
  useEffect(() => {
    if (!source && content) {
      setSource(Doc.createAccessor(content, ['content']));
    }
  }, [content, source]);

  return (
    <div className='h-full w-full flex flex-col overflow-hidden'>
      <pre className='p-2 text-xs text-subdued'>
        {JSON.stringify({ index, identity: identity?.identityKey.truncate(), spaceId, objects }, null, 2)}
      </pre>
      {identity && source ? (
        <div className='p-2 flex grow overflow-hidden'>
          <Editor
            identity={{
              identityKey: identity.identityKey.toHex(),
              displayName: identity.profile?.displayName,
              data: identity.profile?.data,
            }}
            messenger={space}
            source={source}
          />
        </div>
      ) : (
        <Loading data={{ identity: !!identity, content: !!content }} />
      )}
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-editor/Automerge',
  component: Editor as any,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

// TODO(burdon): ERROR: factories.ts:126 Error: Non-base58 character
export const Default: Story = {
  render: DefaultStory,
};

/**
 * Two in-memory ECHO peers (no real networking, see `withMultiClientProvider`) sharing a
 * document, exercising the `Space.postMessage`/`listen` gossip channel and the CodeMirror
 * `awareness` extension end to end. This covers the same wiring as the (currently skipped,
 * flaky) composer-app e2e collaboration cursor test, deterministically and without a browser.
 */
export const WithEcho: Story = {
  decorators: [
    withMultiClientProvider({
      numClients: 2,
      createIdentity: true,
      createSpace: true,
      types: [TestSchema.Expando],
      onCreateSpace: async ({ space }) => {
        space.db.add(
          Obj.make(TestSchema.Expando, {
            type: 'test',
            content: Ref.make(Obj.make(TestSchema.Expando, { content: initialContent })),
          }),
        );
      },
    }),
  ],
  render: EchoStory,
  play: async ({ canvasElement }) => {
    // ECHO identity/space creation and invitation are async; wait for both peers to mount an editor.
    const editors = await waitFor(
      () => {
        const found = Array.from(canvasElement.querySelectorAll<HTMLElement>('.cm-editor'));
        void expect(found).toHaveLength(2);
        return found;
      },
      { timeout: 15_000 },
    );

    const [contentA, contentB] = editors.map((editor) => editor.querySelector<HTMLElement>('.cm-content')!);

    // Initial content replicated from the host's space to the guest.
    await expect(contentA).toHaveTextContent(initialContent);
    await expect(contentB).toHaveTextContent(initialContent);

    // Focusing peer A broadcasts its cursor position over the gossip channel; peer B renders it
    // as a `.cm-collab-selectionInfo` decoration.
    contentA.focus();
    await waitFor(() => expect(editors[1].querySelector('.cm-collab-selectionInfo')).toBeInTheDocument(), {
      timeout: 10_000,
    });

    // And symmetrically in the other direction.
    contentB.focus();
    await waitFor(() => expect(editors[0].querySelector('.cm-collab-selectionInfo')).toBeInTheDocument(), {
      timeout: 10_000,
    });
  },
};
