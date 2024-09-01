//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider } from '@dxos/react-ui';
import { defaultTx, getSize } from '@dxos/react-ui-theme';
import { withFullscreen, withTheme } from '@dxos/storybook-utils';

import translations from './translations';

export default {
  title: 'react-ui-editor/experimental',
  decorators: [withTheme, withFullscreen()],
  parameters: { translations, layout: 'fullscreen' },
};

const Test = () => {
  const icon = 'caret-right';

  const ref1 = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // TODO(burdon): This doesn't work; requires injection of sprite?
    const svg = document.createElement('svg');
    svg.className = getSize(4);
    const use = svg.appendChild(document.createElement('use'));
    use.setAttribute('href', `/icons.svg#ph--${icon}--regular`);
    ref1.current?.appendChild(svg);
    return () => {
      ref1.current?.removeChild(svg);
    };
  }, []);

  const ref2 = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = document.createElement('div');
    createRoot(el).render(
      <ThemeProvider tx={defaultTx}>
        <svg className={getSize(4)}>
          <use href={`/icons.svg#ph--${icon}--regular`} />
        </svg>
      </ThemeProvider>,
    );
    ref2.current?.appendChild(el);
    return () => {
      ref2.current?.removeChild(el);
    };
  }, []);

  return (
    <div>
      <div className='flex p-2'>
        <div>
          <svg className={getSize(4)}>
            <use href={`/icons.svg#ph--${icon}--regular`} />
          </svg>
        </div>
        <div ref={ref1} />
        <div ref={ref2} />
      </div>
    </div>
  );
};

export const IconTest = {
  render: () => <Test />,
};
