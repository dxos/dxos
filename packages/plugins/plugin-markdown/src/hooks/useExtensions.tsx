//
// Copyright 2023 DXOS.org
//

import { type ViewUpdate } from '@codemirror/view';
import React, { type AnchorHTMLAttributes, type ReactNode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

import {
  LayoutAction,
  type PromiseIntentDispatcher,
  createIntent,
  useCapabilities,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { debounceAndThrottle } from '@dxos/async';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { createDocAccessor, fullyQualifiedId } from '@dxos/react-client/echo';
import { getSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Icon, ThemeProvider } from '@dxos/react-ui';
import { type SelectionManager } from '@dxos/react-ui-attention';
import {
  Cursor,
  type EditorStateStore,
  EditorView,
  type EditorViewMode,
  type Extension,
  InputModeExtensions,
  type PreviewOptions,
  type RenderCallback,
  createDataExtensions,
  decorateMarkdown,
  documentId,
  folding,
  formattingKeymap,
  linkTooltip,
  listener,
  preview,
  selectionState,
  typewriter,
} from '@dxos/react-ui-editor';
import { defaultTx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { isTruthy } from '@dxos/util';

import { MarkdownCapabilities } from '../capabilities';
import { Markdown } from '../types';
import { setFallbackName } from '../util';

export type DocumentType = Markdown.Document | DataType.Text | { id: string; text: string };

export type ExtensionsOptions = {
  id: string;
  object: DocumentType;
  dispatch?: PromiseIntentDispatcher;
  settings: Markdown.Settings;
  selectionManager?: SelectionManager;
  viewMode?: EditorViewMode;
  editorStateStore?: EditorStateStore;
  previewOptions?: PreviewOptions;
};

// TODO(burdon): Merge with createBaseExtensions below.
export const useExtensions = ({
  id,
  object,
  settings,
  selectionManager,
  viewMode,
  editorStateStore,
  previewOptions,
}: ExtensionsOptions): Extension[] => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const identity = useIdentity();
  const space = getSpace(object);

  let target: Obj.Any | undefined;
  if (Obj.instanceOf(Markdown.Document, object)) {
    target = (object as Markdown.Document).content.target;
  } else if (Obj.instanceOf(DataType.Text, object)) {
    target = object;
  }

  // TODO(wittjosiah): Autocomplete is not working and this query is causing performance issues.
  // TODO(burdon): Unsubscribe.
  // const query = space?.db.query(Filter.type(DocumentType));
  // query?.subscribe();

  const baseExtensions = useMemo(
    () =>
      createBaseExtensions({
        id,
        object,
        settings,
        selectionManager,
        viewMode,
        previewOptions,
        dispatch,
      }),
    [
      id,
      object,
      viewMode,
      dispatch,
      previewOptions,
      settings,
      settings.debug,
      settings.editorInputMode,
      settings.folding,
      settings.numberedHeadings,
      settings.typewriter,
      selectionManager,
    ],
  );

  const extensionProviders = useCapabilities(MarkdownCapabilities.Extensions);
  const pluginExtensions = useMemo<Extension[]>(() => {
    if (!Obj.instanceOf(Markdown.Document, object)) {
      return [];
    }

    return extensionProviders.flat().reduce((acc: Extension[], provider) => {
      const extension = typeof provider === 'function' ? provider({ document: object as Markdown.Document }) : provider;
      if (extension) {
        acc.push(extension);
      }

      return acc;
    }, []);
  }, [extensionProviders, object]);

  return useMemo<Extension[]>(
    () =>
      [
        // NOTE: Data extensions must be first so that automerge is updated before other extensions compute their state.
        target && createDataExtensions({ id, text: createDocAccessor(target, ['content']), space, identity }),

        // TODO(burdon): Reconcile with effect in parent.
        Obj.instanceOf(Markdown.Document, object) &&
          listener({
            onChange: ({ text }) => setFallbackName(object as Markdown.Document, text),
          }),

        selectionState(editorStateStore),
        baseExtensions,
        pluginExtensions,
      ].filter(isTruthy),
    [identity, space, id, object, target, baseExtensions, pluginExtensions],
  );
};

/**
 * Create extension instances for editor.
 */
const createBaseExtensions = ({
  id,
  object,
  dispatch,
  settings,
  selectionManager,
  viewMode,
  previewOptions,
}: ExtensionsOptions): Extension[] => {
  const extensions: Extension[] = [
    selectionManager && selectionChange(selectionManager),
    settings.editorInputMode && InputModeExtensions[settings.editorInputMode],
    settings.folding && folding(),
  ].filter(isTruthy);

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
          // TODO(burdon): Create dx-tag.
          renderLinkButton:
            dispatch && (object || id)
              ? createLinkRenderer((id: string) => {
                  void dispatch(
                    createIntent(LayoutAction.Open, {
                      part: 'main',
                      subject: [id],
                      options: {
                        pivotId: object ? fullyQualifiedId(object) : id,
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

  if (settings.debug) {
    const items = settings.typewriter?.split(/[,\n]/) ?? '';
    if (items) {
      extensions.push(typewriter({ items }));
    }
  }

  return extensions;
};

const selectionChange = (selectionManager: SelectionManager) => {
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

// TODO(burdon): REMOVE.
const renderRoot = <T extends Element>(root: T, node: ReactNode): T => {
  createRoot(root).render(<ThemeProvider tx={defaultTx}>{node}</ThemeProvider>);
  return root;
};
