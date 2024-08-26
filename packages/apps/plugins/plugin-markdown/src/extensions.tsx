//
// Copyright 2023 DXOS.org
//

import { ArrowSquareDown, ArrowSquareOut, type Icon } from '@phosphor-icons/react';
import React, { type AnchorHTMLAttributes, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { type DocumentType } from '@braneframe/types';
import { type IntentDispatcher, NavigationAction } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { fullyQualifiedId, type Query } from '@dxos/react-client/echo';
import {
  type AutocompleteResult,
  type Extension,
  type EditorViewMode,
  autocomplete,
  decorateMarkdown,
  linkTooltip,
  table,
  typewriter,
  formattingKeymap,
  image,
  InputModeExtensions,
} from '@dxos/react-ui-editor';
import { getSize, mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { type MarkdownSettingsProps } from './types';

export type ExtensionsOptions = {
  viewMode?: EditorViewMode;
  settings?: MarkdownSettingsProps;
  document?: DocumentType;
  debug?: boolean;
  experimental?: boolean;
  query?: Query<DocumentType>;
  dispatch?: IntentDispatcher;
};

/**
 * Create extension instances for editor.
 */
export const getBaseExtensions = ({
  viewMode,
  settings,
  document,
  query,
  dispatch,
}: ExtensionsOptions): Extension[] => {
  const extensions: Extension[] = [
    //
    // Common.
    //
    ...(viewMode === 'source'
      ? []
      : [
          decorateMarkdown({
            selectionChangeDelay: 100,
            // TODO(wittjosiah): For internal links, consider ignoring the link text and rendering the label of the object being linked to.
            renderLinkButton:
              dispatch && document
                ? onRenderLink((id: string) => {
                    void dispatch({
                      action: NavigationAction.ADD_TO_ACTIVE,
                      data: {
                        id,
                        part: 'main',
                        pivotId: fullyQualifiedId(document),
                        scrollIntoView: true,
                      },
                    });
                  })
                : undefined,
          }),
          // TODO(wittjosiah): Factor into decorateMarkdown?
          table(),
        ]),
    formattingKeymap(),
    image(),
    linkTooltip(renderLinkTooltip),
  ];

  //
  // Editor mode.
  //
  if (settings?.editorInputMode) {
    const extension = InputModeExtensions[settings.editorInputMode];
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
                    apply: `[${object.name}](/${fullyQualifiedId(object)})`,
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
  const isInternal =
    url.startsWith('/') ||
    // TODO(wittjosiah): This should probably be parsed out on paste?
    url.startsWith(window.location.origin);

  const options: AnchorHTMLAttributes<any> = isInternal
    ? {
        onClick: () => {
          const qualifiedId = url.split('/').at(-1);
          invariant(qualifiedId, 'Invalid link format.');
          onSelectObject(qualifiedId);
        },
      }
    : {
        href: url,
        rel: 'noreferrer',
        target: '_blank',
      };

  const LinkIcon: Icon = isInternal ? ArrowSquareDown : ArrowSquareOut;

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
