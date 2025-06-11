//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withLayout, withTheme, type Meta } from '@dxos/storybook-utils';

import { EditorStory } from './util';
import { outliner } from '../extensions';
import { listItemToString, treeFacet } from '../extensions/outliner/tree';
import { str } from '../testing';

type StoryProps = {
  text: string;
};

const DefaultStory = ({ text }: StoryProps) => {
  return (
    <EditorStory
      text={text}
      extensions={[outliner()]}
      debug='raw+tree'
      placeholder=''
      debugCustom={(view) => {
        const tree = view.state.facet(treeFacet);
        const lines: string[] = [];
        tree.traverse((item) => lines.push(listItemToString(item)));
        return <pre className='p-1 text-xs text-green-800 dark:text-green-200 overflow-auto'>{lines.join('\n')}</pre>;
      }}
    />
  );
};

const meta: Meta<StoryProps> = {
  title: 'ui/react-ui-editor/Outliner',
  decorators: [withTheme, withLayout({ fullscreen: true })],
  render: DefaultStory,
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const Empty = {
  args: {},
};

export const Basic = {
  args: {
    text: str(
      //
      '- [ ] A',
      '- [ ] B',
      '- [ ] C',
      '- [ ] D',
      '- [ ] E',
      '- [ ] F',
      '- [ ] G',
    ),
  },
};

export const Nested = {
  args: {
    text: str(
      //
      '- [ ] A',
      '  - [ ] B',
      '- [ ] C',
      '  - [ ] D',
      '    - [ ] E',
      '    - [ ] F',
      '- [ ] G',
    ),
  },
};

export const Continuation = {
  args: {
    text: str(
      //
      '- [ ] A',
      '- [ ] B',
      'Continuation line.',
      '- [ ] C',
      '',
      '- [ ] D',
      '- [ ] E',
      '- [ ] F',
      '- [ ] G',
      '',
    ),
  },
};
