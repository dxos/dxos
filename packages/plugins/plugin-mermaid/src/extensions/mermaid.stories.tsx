//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React, { useMemo } from 'react';

import { useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { fixedInsetFlexLayout, groupSurface, mx } from '@dxos/react-ui-theme';
import { type Meta, withTheme } from '@dxos/storybook-utils';

import { mermaid } from './mermaid';

const str = (...lines: string[]) => lines.join('\n');

type StoryProps = {
  text?: string;
};

const Story = ({ text }: StoryProps) => {
  const { themeMode } = useThemeContext();
  const extensions = useMemo(
    () => [
      createBasicExtensions(),
      createMarkdownExtensions({ themeMode }),
      createThemeExtensions({ themeMode }),
      // TODO(burdon): Bug if mermaid extension is provided after decorateMarkdown.
      mermaid(),
      decorateMarkdown(),
    ],
    [],
  );

  const { parentRef, focusAttributes } = useTextEditor(() => ({ initialValue: text, extensions }), [extensions]);

  return (
    <div className={mx(fixedInsetFlexLayout, groupSurface)}>
      <div className='flex justify-center overflow-y-scroll'>
        <div className='flex w-[800px] flex-col py-16'>
          <div role='none' ref={parentRef} {...focusAttributes} />
        </div>
      </div>
    </div>
  );
};

const meta: Meta = {
  title: 'plugin-mermaid/extensions',
  decorators: [withTheme],
};

export default meta;

export const Mermaid = {
  render: () => (
    <Story
      text={str(
        '# Mermaid',
        '',
        'This is a mermaid diagram:',
        '',
        '```mermaid',
        'graph LR;',
        'A-->B;',
        'B-->C;',
        'B-->D;',
        'B-->E;',
        'D-->E;',
        'C-->D;',
        '```',
        '',
        'Inside a markdown document.',
        '',
      )}
    />
  ),
};

export const Error = {
  render: () => (
    <Story
      text={str(
        '# Mermaid',
        '',
        'This is a broken mermaid diagram:',
        '',
        '```mermaid',
        'graph TD;',
        'A- ->B;',
        '```',
        '',
        '',
        '',
      )}
    />
  ),
};
