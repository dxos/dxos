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
import {
  type AutocompleteResult,
  type EditorStateStore,
  type EditorViewMode,
  type Extension,
  InputModeExtensions,
  createDataExtensions,
  autocomplete,
  decorateMarkdown,
  folding,
  formattingKeymap,
  linkTooltip,
  listener,
  selectionState,
  typewriter,
} from '@dxos/react-ui-editor';
import { defaultTx } from '@dxos/react-ui-theme';
import { isNotFalsy } from '@dxos/util';

import { type DocumentType, type MarkdownPluginState, type MarkdownSettingsProps } from './types';
import { setFallbackName } from './util';

type ExtensionsOptions = {
  document?: DocumentType;
  dispatch?: IntentDispatcher;
  query?: Query<DocumentType>;
  settings: MarkdownSettingsProps;
  viewMode?: EditorViewMode;
  editorStateStore?: EditorStateStore;
};

// TODO(burdon): Merge with createBaseExtensions below.
export const useExtensions = ({
  document,
  settings,
  viewMode,
  editorStateStore,
  extensionProviders,
}: ExtensionsOptions & Pick<MarkdownPluginState, 'extensionProviders'>): Extension[] => {
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
        document,
        settings,
        viewMode,
        dispatch,
        // query,
      }),
    [
      document,
      viewMode,
      dispatch,
      settings,
      settings.editorInputMode,
      settings.folding,
      settings.numberedHeadings,
      settings.debug,
      settings.typewriter,
    ],
  );

  //
  // External extensions from other plugins.
  //
  const pluginExtensions = useMemo<Extension[] | undefined>(
    () =>
      extensionProviders?.reduce((acc: Extension[], provider) => {
        const extension = typeof provider === 'function' ? provider({ document }) : provider;
        if (extension) {
          acc.push(extension);
        }

        return acc;
      }, []),
    [extensionProviders, document],
  );

  //
  // Basic plugins.
  //
  return useMemo<Extension[]>(
    () =>
      [
        // NOTE: Data extensions must be first so that automerge is updated before other extensions compute their state.
        document &&
          createDataExtensions({
            id: document.id,
            text: document.content.target && createDocAccessor(document.content.target, ['content']),
            space,
            identity,
          }),
        selectionState(editorStateStore),
        document &&
          listener({
            onChange: (text) => setFallbackName(document, text),
          }),
        baseExtensions,
        pluginExtensions,
      ].filter(isNotFalsy),
    [baseExtensions, pluginExtensions, document, document?.content, space, identity],
  );
};

/**
 * Create extension instances for editor.
 */
const createBaseExtensions = ({ document, dispatch, settings, query, viewMode }: ExtensionsOptions): Extension[] => {
  const extensions: Extension[] = [
    settings.editorInputMode && InputModeExtensions[settings.editorInputMode],
    settings.folding && folding(),
  ].filter(isNotFalsy);

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
            .filter(isNotFalsy);
        },
      }),
    );
  }

  if (settings.debug) {
    const items = settings.typewriter?.split(/[,\n]/) ?? '';
    if (items) {
      extensions.push(typewriter({ items }));
    }
  }

  return extensions;
};

// TODO(burdon): Factor out styles.
const style = {
  hover: 'rounded-sm text-primary-500 hover:text-primary-600 dark:text-primary-500 hover:dark:text-primary-400',
  icon: 'inline-block leading-none mis-1 cursor-pointer',
};

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
    <a {...options} className={style.hover}>
      <Icon
        icon={isInternal ? 'ph--arrow-square-down--bold' : 'ph--arrow-square-out--bold'}
        size={4}
        classNames={style.icon}
      />
    </a>,
  );
};

const renderLinkTooltip = (el: Element, url: string) => {
  const web = new URL(url);
  renderRoot(
    el,
    <a href={url} rel='noreferrer' target='_blank' className={style.hover}>
      {web.origin}
      <Icon icon='ph--arrow-square-out--bold' size={4} classNames={style.icon} />
    </a>,
  );
};

// TODO(burdon): Remove react rendering; use DOM directly.
export const renderRoot = <T extends Element>(root: T, node: ReactNode): T => {
  createRoot(root).render(<ThemeProvider tx={defaultTx}>{node}</ThemeProvider>);
  return root;
};
