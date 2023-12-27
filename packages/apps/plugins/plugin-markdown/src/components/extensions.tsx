//
// Copyright 2023 DXOS.org
//

import { ArrowSquareOut } from '@phosphor-icons/react';
import React, { type AnchorHTMLAttributes, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { useIntent, type DispatchIntent, LayoutAction } from '@dxos/app-framework';
import {
  type AutocompleteOptions,
  type CommentsOptions,
  type Extension,
  type ListenerOptions,
  type TooltipOptions,
  autocomplete,
  comments,
  image,
  link,
  listener,
  table,
  tasklist,
  tooltip,
} from '@dxos/react-ui-editor';
import { getSize, mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

// TODO(burdon): Factor out style.
const hover = 'rounded-sm text-primary-600 hover:text-primary-500 dark:text-primary-300 hover:dark:text-primary-200';

const onRender = (dispatch: DispatchIntent) => (el: Element, url: string) => {
  // TODO(burdon): Dispatch if local link.
  const options: AnchorHTMLAttributes<any> = url.startsWith('/')
    ? {
        onClick: () => {
          void dispatch({
            action: LayoutAction.ACTIVATE,
            data: { id: url.slice(1) },
          });
        },
      }
    : {
        href: url,
        rel: 'noreferrer',
        target: '_blank',
      };

  createRoot(el).render(
    <StrictMode>
      <a {...options} className={hover}>
        <ArrowSquareOut weight='bold' className={mx(getSize(4), 'inline-block leading-none mis-1 cursor-pointer')} />
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
        <ArrowSquareOut weight='bold' className={mx(getSize(4), 'inline-block leading-none mis-1 cursor-pointer')} />
      </a>
    </StrictMode>,
  );
};

// TODO(burdon): Make markdown plugins separately configurable.
export type UseExtensionsOptions = {
  experimental?: boolean;
  listener?: ListenerOptions;
  autocomplete?: AutocompleteOptions;
  comments?: CommentsOptions;
};

export const useExtensions = ({
  experimental,
  listener: listenerOption,
  autocomplete: autoCompleteOption,
  comments: commentsOptions,
}: UseExtensionsOptions = {}): Extension[] => {
  const { dispatch } = useIntent();
  const extensions: Extension[] = [];
  if (experimental) {
    extensions.push(
      ...[
        image(),
        link({ onRender: onRender(dispatch) }),
        table(),
        tasklist(),
        tooltip({ onHover }),
        autoCompleteOption && autocomplete(autoCompleteOption),
        commentsOptions && comments(commentsOptions),
        listenerOption && listener(listenerOption),
      ].filter(nonNullable),
    );
  }

  return extensions;
};
