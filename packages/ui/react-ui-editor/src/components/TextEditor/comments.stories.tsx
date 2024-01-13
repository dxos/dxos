//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { useState } from 'react';

import { TextObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { fixedInsetFlexLayout, groupSurface, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { MarkdownEditor, type TextEditorProps } from './TextEditor';
import { comments } from '../../extensions';
import { useTextModel } from '../../hooks';

faker.seed(101);

const str = (...lines: string[]) => lines.join('\n');

const document = str(
  '# Comments',
  '',
  str(...faker.helpers.multiple(() => [faker.lorem.paragraph(), ''], { count: 3 }).flat()),
  '',
);

type StoryProps = {
  text?: string;
} & Pick<TextEditorProps, 'comments' | 'readonly' | 'extensions' | 'slots'>;

const Story = ({ text, ...props }: StoryProps) => {
  const [item] = useState({ text: new TextObject(text) });
  const model = useTextModel({ text: item.text });
  if (!model) {
    return null;
  }

  return (
    <div className={mx(fixedInsetFlexLayout, groupSurface)}>
      <div className='flex justify-center overflow-y-scroll'>
        <div className='flex flex-col w-[800px] py-16'>
          <MarkdownEditor model={model} {...props} />
          <div className='flex shrink-0 h-[300px]'></div>
        </div>
      </div>
    </div>
  );
};

export default {
  title: 'react-ui-editor/comments',
  component: MarkdownEditor,
  decorators: [withTheme],
  render: Story,
};

export const Default = {
  render: () => (
    <Story
      text={document}
      extensions={[
        comments({
          onCreate: (relPos) => {
            const id = PublicKey.random().toHex();
            return id;
          },
          onSelect: (state) => {
            const debug = false;
            if (debug) {
              console.log(
                'update',
                JSON.stringify({
                  active: state.active?.slice(0, 8),
                  closest: state.closest?.slice(0, 8),
                  ranges: state.ranges.length,
                }),
              );
            }
          },
        }),
      ]}
    />
  ),
};
