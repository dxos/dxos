//
// Copyright 2023 DXOS.org
//

import React, { type AnchorHTMLAttributes, type ReactNode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

import { type IntentDispatcher, NavigationAction, useIntentDispatcher } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { createDocAccessor, fullyQualifiedId, getSpace, type Query } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Icon, ThemeProvider } from '@dxos/react-ui';
import { createDataExtensions, listener, localStorageStateStoreAdapter, state } from '@dxos/react-ui-editor';
import {
  type AutocompleteResult,
  type Extension,
  type EditorViewMode,
  InputModeExtensions,
  autocomplete,
  decorateMarkdown,
  folding,
  formattingKeymap,
  linkTooltip,
  typewriter,
} from '@dxos/react-ui-editor';
import { defaultTx } from '@dxos/react-ui-theme';
import { isNotFalsy, nonNullable } from '@dxos/util';

import { type DocumentType, type MarkdownPluginState, type MarkdownSettingsProps } from './types';
import { setFallbackName } from './util';

type ExtensionsOptions = {
  document: DocumentType;
  dispatch?: IntentDispatcher;
  query?: Query<DocumentType>;
  settings: MarkdownSettingsProps;
  viewMode?: EditorViewMode;
};

/**
 * Create extension instances for editor.
 */
const createBaseExtensions = ({ document, dispatch, settings, query, viewMode }: ExtensionsOptions): Extension[] => {
  const extensions: Extension[] = [];

  //
  // Editor mode.
  //
  if (settings.editorInputMode) {
    const extension = InputModeExtensions[settings.editorInputMode];
    if (extension) {
      extensions.push(extension);
    }
  }

  //
  // Markdown
  //
  if (viewMode !== 'source') {
    extensions.push(
      ...[
        formattingKeymap(),
        decorateMarkdown({
          selectionChangeDelay: 100,
          numberedHeadings: settings.numberedHeadings ? { from: 2 } : undefined,
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
        linkTooltip(renderLinkTooltip),
      ],
    );
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

  extensions.push(...[settings.folding && folding()].filter(isNotFalsy));

  if (settings.debug) {
    const items = settings.typewriter ?? '';
    extensions.push(...[items ? typewriter({ items: items.split(/[,\n]/) }) : undefined].filter(nonNullable));
  }

  return extensions;
};

// TODO(burdon): Merge with createBaseExtensions above.
export const useExtensions = ({
  extensionProviders,
  document,
  settings,
  viewMode,
}: Pick<ExtensionsOptions, 'document' | 'settings' | 'viewMode'> &
  Pick<MarkdownPluginState, 'extensionProviders'>): Extension[] => {
  const dispatch = useIntentDispatcher();
  const identity = useIdentity();
  const space = getSpace(document);

  // TODO(wittjosiah): Autocomplete is not working and this query is causing performance issues.
  // TODO(burdon): Unsubscribe.
  // const query = space?.db.query(Filter.schema(DocumentType));
  // query?.subscribe();
  const baseExtensions = useMemo(
    () =>
      createBaseExtensions({
        viewMode,
        settings,
        document,
        dispatch,
        // query,
      }),
    [document, viewMode, dispatch, settings, settings.folding, settings.numberedHeadings],
  );

  const pluginExtensions = useMemo<Extension[] | undefined>(
    () =>
      extensionProviders?.reduce((acc: Extension[], provider) => {
        const extension = typeof provider === 'function' ? provider({ document }) : provider;
        if (extension) {
          acc.push(extension);
        }

        return acc;
      }, []),
    [extensionProviders],
  );

  return useMemo<Extension[]>(
    () =>
      [
        // NOTE: Data extensions must be first so that automerge is updated before other extensions compute their state.
        createDataExtensions({
          id: document.id,
          text: document.content && createDocAccessor(document.content, ['content']),
          space,
          identity,
        }),
        state(localStorageStateStoreAdapter),
        listener({
          onChange: (text) => {
            setFallbackName(document, text);
          },
        }),
        baseExtensions,
        pluginExtensions,
      ].filter(nonNullable),
    [baseExtensions, pluginExtensions, document, document.content, space, identity],
  );
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

  renderRoot(
    el,
    <a {...options} className={hover}>
      <Icon
        icon={isInternal ? 'ph--arrows-square-down--bold' : 'ph--arrows-square-out--bold'}
        size={4}
        classNames='inline-block leading-none mis-1 cursor-pointer'
      />
    </a>,
  );
};

const renderLinkTooltip = (el: Element, url: string) => {
  const web = new URL(url);
  renderRoot(
    el,
    <a href={url} target='_blank' rel='noreferrer' className={hover}>
      {web.origin}
      <Icon icon='ph--arrow-square-out--bold' size={4} classNames='inline-block leading-none mis-1 cursor-pointer' />
    </a>,
  );
};

// TODO(burdon): Factor out. Reconcile with rect-ui-editor.
export const renderRoot = <T extends Element>(root: T, node: ReactNode): T => {
  createRoot(root).render(<ThemeProvider tx={defaultTx}>{node}</ThemeProvider>);
  return root;
};
