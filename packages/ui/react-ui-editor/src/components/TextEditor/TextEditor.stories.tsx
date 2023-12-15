//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { markdown } from '@codemirror/lang-markdown';
import { type Extension } from '@codemirror/state';
import { ArrowSquareOut } from '@phosphor-icons/react';
import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { TextObject } from '@dxos/echo-schema';
import { fixedInsetFlexLayout, getSize, groupSurface, inputSurface, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { TextEditor } from './TextEditor';
import { createHyperlinkTooltip, hyperlinkDecoration, hyperlinkWidget } from './extensions';
import { useTextModel } from '../../hooks';

const text = [
  '',
  '',
  'This is all about [DXOS](https://dxos.org); read more [here](https://docs.dxos.org/guide/getting-started.html).',
  '',
  '',
].join('\n');

const hyperLinkTooltip = () =>
  createHyperlinkTooltip((el, url) => {
    const web = new URL(url);
    createRoot(el).render(
      <StrictMode>
        <a
          href={url}
          target='_blank'
          rel='noreferrer'
          className={mx(
            'rounded-sm text-base text-primary-600 hover:text-primary-500 dark:text-primary-300 hover:dark:text-primary-200',
          )}
        >
          {web.origin}
          <ArrowSquareOut weight='bold' className={mx(getSize(4), 'inline-block leading-none mis-1')} />
        </a>
      </StrictMode>,
    );
  });

const Story = ({ extensions, automerge }: { extensions: Extension[]; automerge?: boolean }) => {
  const [item] = useState({ text: new TextObject(text, undefined, undefined, { useAutomergeBackend: automerge }) });
  const model = useTextModel({ text: item.text });
  if (!model) {
    return <></>;
  }

  return (
    <div className={mx(fixedInsetFlexLayout, groupSurface)}>
      <div className='flex justify-center p-8'>
        <div className='w-[800px]'>
          <TextEditor
            model={model}
            extensions={[
              ...extensions,
              // EditorView.domEventHandlers({
              //   mousedown: (e, view) => {},
              // }),
            ]}
            slots={{ root: { className: mx(inputSurface, 'p-2') } }}
          />
        </div>
      </div>
    </div>
  );
};

export default {
  component: TextEditor,
  decorators: [withTheme],
  render: Story,
};

export const Default = {
  render: () => <Story extensions={[markdown(), hyperlinkDecoration({ link: false }), hyperLinkTooltip()]} />,
};

export const Automerge = {
  render: () => <Story automerge extensions={[markdown(), hyperlinkDecoration({ link: false }), hyperLinkTooltip()]} />,
};

export const Widget = {
  render: () => <Story extensions={[hyperlinkWidget]} />,
};
