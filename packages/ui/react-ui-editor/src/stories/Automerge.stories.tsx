//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useState } from 'react';
import { expect, waitFor } from 'storybook/test';

import { Obj, Query, Ref } from '@dxos/echo';
import { createObject } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { TestSchema } from '@dxos/echo/testing';
import { type Messenger } from '@dxos/protocols';
import { useQuery, useResolveRef, useSpace } from '@dxos/react-client/echo';
import { type Identity, useIdentity } from '@dxos/react-client/halo';
import { useClientStory, withMultiClientProvider } from '@dxos/react-client/testing';
import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { createBasicExtensions, createDataExtensions, createThemeExtensions } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { translations } from '#translations';

import { useTextEditor } from '../hooks';

const initialContent = ['# Hello world!', 'Hello Automerge', ''].join('\n\n');

type EditorProps = ThemedClassName<{
  source: Doc.Accessor;
  messenger?: Messenger;
  identity?: Identity;
  autoFocus?: boolean;
}>;

const Editor = ({ classNames, source, messenger, identity, autoFocus }: EditorProps) => {
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

  return <div ref={parentRef} className={mx('w-full', classNames)} />;
};

/**
 * Two editors bound to the same in-process Automerge document (no client or networking). Editing
 * either column mutates the shared handle; the automerge data extension on the other column observes
 * the handle's `change` event and reconciles, so the columns stay in sync. For true cross-peer
 * replication over a transport, see the `WithEcho` story.
 */
const DefaultStory = () => {
  const source = useMemo<Doc.Accessor>(
    () => Doc.createAccessor(createObject(Text.make({ content: initialContent })), ['content']),
    [],
  );

  return (
    <div className='dx-container grid grid-cols-2 gap-3 p-3'>
      <div className='dx-container p-2 bg-base-surface rounded-md border border-subdued-separator'>
        <Editor source={source} autoFocus />
      </div>
      <div className='dx-container p-2 bg-base-surface rounded-md border border-subdued-separator'>
        <Editor source={source} />
      </div>
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
          <Editor identity={identity} messenger={space} source={source} />
        </div>
      ) : (
        <Loading data={{ identity: !!identity, content: !!content }} />
      )}
    </div>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-editor/Automerge',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

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
