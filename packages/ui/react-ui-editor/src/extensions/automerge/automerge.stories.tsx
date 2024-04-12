//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';
import '@preact/signals-react';
import React, { useEffect, useMemo, useState } from 'react';

import { Repo } from '@dxos/automerge/automerge-repo';
import { Filter, DocAccessor, TextCompatibilitySchema } from '@dxos/echo-schema';
import * as E from '@dxos/echo-schema';
import { type PublicKey } from '@dxos/keys';
import { useSpace } from '@dxos/react-client/echo';
import { ClientRepeater } from '@dxos/react-client/testing';
import { useThemeContext } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { automerge } from './automerge';
import { useTextEditor } from '../../hooks';
import translations from '../../translations';
import { createBasicExtensions, createThemeExtensions } from '../factories';

const initialContent = 'Hello world!';

type TestObject = {
  text: string;
};

type EditorProps = {
  source: DocAccessor;
  autoFocus?: boolean;
};

const Editor = ({ source, autoFocus }: EditorProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(
    () => ({
      doc: DocAccessor.getValue(source),
      extensions: [
        createBasicExtensions({ placeholder: 'Type here...' }),
        createThemeExtensions({ themeMode, slots: { editor: { className: 'p-2 bg-white dark:bg-black' } } }),
        automerge(source),
      ],
      autoFocus,
    }),
    [source, themeMode],
  );

  return <div ref={parentRef} />;
};

const Story = () => {
  const [object1, setObject1] = useState<DocAccessor<TestObject>>();
  const [object2, setObject2] = useState<DocAccessor<TestObject>>();

  useEffect(() => {
    queueMicrotask(async () => {
      const repo1 = new Repo({ network: [new BroadcastChannelNetworkAdapter()] });
      const repo2 = new Repo({ network: [new BroadcastChannelNetworkAdapter()] });

      const object1 = repo1.create();
      object1.change((doc: TestObject) => {
        doc.text = initialContent;
      });

      const object2 = repo2.find(object1.url);
      await object2.whenReady();

      setObject1({ handle: object1, path: ['text'] });
      setObject2({ handle: object2, path: ['text'] });
    });
  }, []);

  if (!object1 || !object2) {
    return null;
  }

  return (
    <div role='none' className='grid grid-cols-2 bs-full is-full divide-x divide-neutral-500'>
      <Editor source={object1} autoFocus />
      <Editor source={object2} />
    </div>
  );
};

export default {
  title: 'react-ui-editor/Automerge',
  component: Editor,
  decorators: [withTheme],
  render: () => <Story />,
  parameters: { translations, layout: 'fullscreen' },
};

const EchoStory = ({ spaceKey }: { spaceKey: PublicKey }) => {
  // TODO(burdon): Test identity.
  // const identity = useIdentity();
  const space = useSpace(spaceKey);
  const source = useMemo<DocAccessor | undefined>(() => {
    const { objects = [] } = space?.db.query<E.Expando>(Filter.from({ type: 'test' })) ?? {};
    if (objects.length) {
      return E.createDocAccessor(objects[0].content, ['content']);
    }
  }, [space]);

  if (!source) {
    return null;
  }

  return <Editor source={source} />;
};

export const Default = {};

// TODO(burdon): Error:
//  chunk-6NX3RPDS.mjs:2021 ControlPipeline#5 Error: invariant violation: Feed already added
export const WithEcho = {
  decorators: [withTheme],
  render: () => {
    return (
      <ClientRepeater
        count={2}
        component={EchoStory}
        createSpace
        onCreateSpace={async (space) => {
          space.db.add(
            E.object({
              type: 'test',
              content: E.object(TextCompatibilitySchema, { content: initialContent }),
            }),
          );
        }}
      />
    );
  },
};
