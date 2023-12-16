//
// Copyright 2023 DXOS.org
//

import { ArrowSquareOut } from '@phosphor-icons/react';
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import {
  link,
  tasklist,
  tooltip,
  type Extension,
  type TextListener,
  type LinkOptions,
  listener,
  type TooltipOptions,
} from '@dxos/react-ui-editor';
import { getSize, mx } from '@dxos/react-ui-theme';

// TODO(burdon): Factor out style.
const hover = 'rounded-sm text-primary-600 hover:text-primary-500 dark:text-primary-300 hover:dark:text-primary-200';

const onRender: LinkOptions['onRender'] = (el, url) => {
  createRoot(el).render(
    <StrictMode>
      <a href={url} target='_blank' rel='noreferrer' className={hover}>
        <ArrowSquareOut weight='bold' className={mx(getSize(4), 'inline-block leading-none mis-1 mb-1')} />
      </a>
    </StrictMode>,
  );
};

export const onHover: TooltipOptions['onHover'] = (el, url) => {
  const web = new URL(url);
  createRoot(el).render(
    <StrictMode>
      <a href={url} target='_blank' rel='noreferrer' className={hover}>
        {web.origin}
        <ArrowSquareOut weight='bold' className={mx(getSize(4), 'inline-block leading-none mis-1')} />
      </a>
    </StrictMode>,
  );
};

type UseExtensionsOptions = {
  showWidgets?: boolean;
  onChange?: TextListener;
};

export const useExtensions = ({ showWidgets, onChange }: UseExtensionsOptions = {}): Extension[] => {
  return [link({ onRender }), tooltip({ onHover }), showWidgets && tasklist(), onChange && listener(onChange)].filter(
    Boolean,
  ) as Extension[];
};
