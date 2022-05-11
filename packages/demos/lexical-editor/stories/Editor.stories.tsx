//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import React, { FC } from 'react';

import { ClientProvider, ProfileInitializer } from '@dxos/react-client';

import { Editor, FramePlugin, MenuPlugin } from '../src';
import { Container } from './helpers';

const log = debug('dxos:lexical:test');
debug.enable('dxos:lexical:*');

export default {
  title: 'Lexical/Editor'
};

const EditorContainer: FC<{}> = ({}) => {
  return (
    <div style={{
      display: 'flex',
      flex: 1,
      margin: 8,
      padding: 8,
      border: '1px solid #ccc'
    }}>
      <Editor>
        <MenuPlugin />
        <FramePlugin />
      </Editor>
    </div>
  );
};

export const Primary = () => {
  return (
    <Container>
      <ClientProvider>
        <ProfileInitializer>
          <EditorContainer />
        </ProfileInitializer>
      </ClientProvider>
    </Container>
  );
};
