//
// Copyright 2023 DXOS.org
//

import { ArrowSquareDown, ArrowSquareOut, type Icon } from '@phosphor-icons/react';
import React, { type AnchorHTMLAttributes, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { type DocumentType } from '@braneframe/types';
import { type IntentDispatcher, LayoutAction } from '@dxos/app-framework';
import { type Query } from '@dxos/react-client/echo';
import {
  type AutocompleteResult,
  type Extension,
  EditorModes,
  autocomplete,
  decorateMarkdown,
  linkTooltip,
  table,
  typewriter,
  formattingKeymap,
  image,
} from '@dxos/react-ui-editor';
import { getSize, mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { type MarkdownSettingsProps } from './types';

export type ExtensionsOptions = {
  dispatch?: IntentDispatcher;
  settings?: MarkdownSettingsProps;
  document?: DocumentType;
  debug?: boolean;
  experimental?: boolean;
  query?: Query<DocumentType>;
};

/**
 * Create extension instances for editor.
 */
export const getExtensions = ({ dispatch, settings, document, query }: ExtensionsOptions): Extension[] => {
  const extensions: Extension[] = [
    //
    // Common.
    //
    decorateMarkdown({
      selectionChangeDelay: 100,
      renderLinkButton: dispatch
        ? onRenderLink((id: string) => {
            void dispatch({
              action: LayoutAction.SCROLL_INTO_VIEW,
              data: { id },
            });
          })
        : undefined,
    }),
    formattingKeymap(),
    image(),
    table(),
    linkTooltip(renderLinkTooltip),
  ];

  //
  // Editor mode.
  //
  if (settings?.editorMode) {
    const extension = EditorModes[settings.editorMode];
    if (extension) {
      extensions.push(extension);
    }
  }

  //
  // Autocomplete object links.
  //
  if (query) {
    extensions.push(
      autocomplete({
        onSearch: (text: string) => {
          // TODO query
          // TODO(burdon): Specify filter (e.g., stack).
          return query.objects
            .map<AutocompleteResult | undefined>((object) =>
              object.name?.length && object.id !== document?.id
                ? {
                    label: object.name,
                    // TODO(burdon): Factor out URL builder.
                    apply: `[${object.name}](/${object.id})`,
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

  const LinkIcon: Icon = url.startsWith('/') ? ArrowSquareDown : ArrowSquareOut;

  createRoot(el).render(
    <StrictMode>
      <a {...options} className={hover}>
        <LinkIcon weight='bold' className={mx(getSize(4), 'inline-block leading-none mis-1 cursor-pointer')} />
      </a>
    </StrictMode>,
  );
};

const renderLinkTooltip = (el: Element, url: string) => {
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
