//
// Copyright 2023 DXOS.org
//

import { ArrowSquareOut } from '@phosphor-icons/react';
import React, { type AnchorHTMLAttributes, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Document as DocumentType } from '@braneframe/types';
import { type IntentDispatcher, LayoutAction } from '@dxos/app-framework';
import { getSpaceForObject } from '@dxos/react-client/echo';
import {
  type AutocompleteResult,
  type Extension,
  type LinkOptions,
  autocomplete,
  code,
  heading,
  hr,
  image,
  link,
  table,
  tasklist,
  typewriter,
  formatting,
} from '@dxos/react-ui-editor';
import { getSize, mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import type { MarkdownSettingsProps } from './types';

export type ExtensionsOptions = {
  settings?: MarkdownSettingsProps;
  document?: DocumentType;
  debug?: boolean;
  experimental?: boolean;
  dispatch?: IntentDispatcher;
};

/**
 * Create extension instances for editor.
 */
export const getExtensions = ({ settings, document, dispatch }: ExtensionsOptions): Extension[] => {
  const space = document ? getSpaceForObject(document) : undefined;

  const extensions: Extension[] = [
    //
    // Common.
    //
    code(),
    formatting(),
    heading(),
    hr(),
    image(),
    table(),
    tasklist(),
  ];

  //
  // Hyperlinks (external and internal object links).
  //
  if (dispatch) {
    extensions.push(
      link({
        onHover: onHoverLinkTooltip,
        onRender: onRenderLink((id: string) => {
          void dispatch({
            action: LayoutAction.ACTIVATE,
            data: { id },
          });
        }),
      }),
    );
  }

  //
  // Autocomplete object links.
  //
  if (space) {
    extensions.push(
      autocomplete({
        onSearch: (text: string) => {
          // TODO(burdon): Specify filter (e.g., stack).
          const { objects = [] } = space?.db.query(DocumentType.filter()) ?? {};
          return objects
            .map<AutocompleteResult | undefined>((object) =>
              object.title?.length && object.id !== document?.id
                ? {
                    label: object.title,
                    // TODO(burdon): Factor out URL builder.
                    apply: `[${object.title}](/${object.id})`,
                  }
                : undefined,
            )
            .filter(nonNullable);
        },
      }),
    );
  }

  if (settings?.debug) {
    const items = settings.typewriter ?? '';
    extensions.push(...[items ? typewriter({ items: items.split(/[,\n]/) }) : undefined].filter(nonNullable));
  }

  if (settings?.experimental) {
    extensions.push(...[].filter(nonNullable));
  }

  return extensions;
};

// TODO(burdon): Factor out style.
const hover = 'rounded-sm text-primary-600 hover:text-primary-500 dark:text-primary-300 hover:dark:text-primary-200';

const onRenderLink = (onSelectObject: (id: string) => void) => (el: Element, url: string) => {
  // TODO(burdon): Formalize/document internal link format.
  const options: AnchorHTMLAttributes<any> = url.startsWith('/')
    ? {
        onClick: () => {
          onSelectObject(url.slice(1));
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

const onHoverLinkTooltip: LinkOptions['onHover'] = (el, url) => {
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
