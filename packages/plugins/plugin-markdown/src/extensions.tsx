//
// Copyright 2023 DXOS.org
//

import { type ViewUpdate } from '@codemirror/view';
import React, { type AnchorHTMLAttributes, type ReactNode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

import {
  createIntent,
  LayoutAction,
  type PromiseIntentDispatcher,
  useCapabilities,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { debounceAndThrottle } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { createDocAccessor, fullyQualifiedId, getSpace, type QueryResult } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Icon, ThemeProvider } from '@dxos/react-ui';
import { type SelectionManager } from '@dxos/react-ui-attention';
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
  preview,
  selectionState,
  typewriter,
  type RenderCallback,
  EditorView,
  documentId,
  Cursor,
  type PreviewOptions,
} from '@dxos/react-ui-editor';
import { defaultTx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';
import { isNotFalsy } from '@dxos/util';

import { MarkdownCapabilities } from './capabilities';
import { type DocumentType, type MarkdownSettingsProps } from './types';
import { setFallbackName } from './util';

type ExtensionsOptions = {
  document?: DocumentType;
  id?: string;
  text?: DataType.Text;
  dispatch?: PromiseIntentDispatcher;
  query?: QueryResult<DocumentType>;
  settings: MarkdownSettingsProps;
  selectionManager?: SelectionManager;
  viewMode?: EditorViewMode;
  editorStateStore?: EditorStateStore;
  previewOptions?: PreviewOptions;
};

// TODO(burdon): Merge with createBaseExtensions below.
export const useExtensions = ({
  document,
  id,
  text,
  settings,
  selectionManager,
  viewMode,
  editorStateStore,
  previewOptions,
}: ExtensionsOptions): Extension[] => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const identity = useIdentity();
  const space = getSpace(document) ?? getSpace(text);

  // TODO(wittjosiah): Autocomplete is not working and this query is causing performance issues.
  // TODO(burdon): Unsubscribe.
  // const query = space?.db.query(Filter.type(DocumentType));
  // query?.subscribe();
  const baseExtensions = useMemo(
    () =>
      createBaseExtensions({
        document,
        id,
        text,
        settings,
        selectionManager,
        viewMode,
        previewOptions,
        dispatch,
        // query,
      }),
    [
      document,
      id,
      text,
      viewMode,
      dispatch,
      previewOptions,
      settings,
      settings.editorInputMode,
      settings.folding,
      settings.numberedHeadings,
      settings.debug,
      settings.typewriter,
      selectionManager,
    ],
  );

  const extensionProviders = useCapabilities(MarkdownCapabilities.Extensions);

  //
  // External extensions from other plugins.
  //
  const pluginExtensions = useMemo<Extension[]>(() => {
    if (!document) {
      return [];
    }

    return extensionProviders.flat().reduce((acc: Extension[], provider) => {
      const extension = typeof provider === 'function' ? provider({ document }) : provider;
      if (extension) {
        acc.push(extension);
      }

      return acc;
    }, []);
  }, [extensionProviders, document]);

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
        text &&
          id &&
          createDataExtensions({
            id,
            text: createDocAccessor(text, ['content']),
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
    [baseExtensions, pluginExtensions, document, document?.content?.target, text, id, space, identity],
  );
};

/**
 * Create extension instances for editor.
 */
const createBaseExtensions = ({
  document,
  id,
  dispatch,
  settings,
  selectionManager,
  query,
  viewMode,
  previewOptions,
}: ExtensionsOptions): Extension[] => {
  const extensions: Extension[] = [
    selectionManager && selectionChange(selectionManager),
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
            dispatch && (document || id)
              ? createLinkRenderer((id: string) => {
                  void dispatch(
                    createIntent(LayoutAction.Open, {
                      part: 'main',
                      subject: [id],
                      options: {
                        pivotId: document ? fullyQualifiedId(document) : id,
                      },
                    }),
                  );
                })
              : undefined,
        }),
        linkTooltip(renderLinkTooltip),
        preview(previewOptions),
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

export const selectionChange = (selectionManager: SelectionManager) => {
  return EditorView.updateListener.of(
    debounceAndThrottle((update: ViewUpdate) => {
      if (update.selectionSet) {
        const id = update.state.facet(documentId);
        const cursorConverter = update.state.facet(Cursor.converter);
        const selection = update.state.selection;
        const ranges = selection.ranges
          .map((range) => ({
            from: cursorConverter.toCursor(range.from),
            to: cursorConverter.toCursor(range.to),
          }))
          .filter(({ from, to }) => to > from);
        selectionManager.updateMultiRange(id, ranges);
      }
    }, 100),
  );
};

// TODO(burdon): Factor out styles.
const style = {
  hover: 'rounded-sm text-primary-500 hover:text-primary-600 dark:text-primary-500 hover:dark:text-primary-400',
  icon: 'inline-block leading-none mis-1 cursor-pointer',
};

const createLinkRenderer =
  (onSelectObject: (id: string) => void): RenderCallback<{ url: string }> =>
  (el, { url }) => {
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

const renderLinkTooltip: RenderCallback<{ url: string }> = (el, { url }) => {
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
