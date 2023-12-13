//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { markdown } from '@codemirror/lang-markdown';
import { ArrowCircleUp } from '@phosphor-icons/react';
import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { TextObject } from '@dxos/echo-schema';
import { fixedInsetFlexLayout, getSize, groupSurface, inputSurface, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { TextEditor } from './TextEditor';
import { useTextModel } from '../../model';
import { createHyperlinkTooltip, hyperlinkDecoration } from '../Markdown';

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
        <div className='flex gap-1 items-center'>
          <ArrowCircleUp className={mx(getSize(6), 'text-blue-500')} />
          <p className='pr-1'>{web.origin}</p>
        </div>
      </StrictMode>,
    );
  });

const Story = () => {
  const [item] = useState({ text: new TextObject(text) });
  const model = useTextModel({ text: item.text });

  return (
    <div className={mx(fixedInsetFlexLayout, groupSurface)}>
      <div className='flex justify-center p-8'>
        <div className='w-[800px]'>
          <TextEditor
            model={model}
            extensions={[
              markdown(),
              hyperlinkDecoration({ link: false }),
              hyperLinkTooltip(),
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

export const Default = {};
