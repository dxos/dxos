//
// Copyright 2023 DXOS.org
//

import { type ViewUpdate } from '@codemirror/view';
import { useMemo } from 'react';
import { debounceAndThrottle } from '@dxos/async';
import { Obj } from '@dxos/echo';
import { createDocAccessor } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { getSpace, useObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { type SelectionManager } from '@dxos/react-ui-attention';
import { Text } from '@dxos/schema';
import { Domino } from '@dxos/ui';
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
  replacer,
  selectionState,
  typewriter,
} from '@dxos/ui-editor';
import { useThemeContext } from '@dxos/react-ui';
import { isTruthy, safeUrl } from '@dxos/util';

import { Markdown } from '../types';
import { setFallbackName } from '../util';
import { fromUrlPath } from '@dxos/app-toolkit';

export type DocumentType = Markdown.Document | Text.Text | { id: string; text: string };

export type ExtensionsOptions = {
  id: string;
  object?: DocumentType;
  settings?: Markdown.Settings;
  selectionManager?: SelectionManager;
  viewMode?: EditorViewMode;
  editorStateStore?: EditorStateStore;
  previewOptions?: PreviewOptions;
  platform?: 'mobile' | 'desktop';
  /** Callback when an internal link is clicked. */
  onSelectObject?: (objectId: string) => void;
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
  onSelectObject,
}: ExtensionsOptions): Extension[] => {
  const { platform } = useThemeContext();
  const identity = useIdentity();
  const space = getSpace(object);

  // Get the content reference from Document objects.
  const contentRef = Obj.instanceOf(Markdown.Document, object) ? (object as Markdown.Document).content : undefined;
  // Use useObject to trigger re-render when the reference loads (returns snapshot for reactivity).
  useObject(contentRef);
  // Get the actual live object target via .target (needed for createDocAccessor).
  const target = contentRef?.target ?? (Obj.instanceOf(Text.Text, object) ? object : undefined);

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
        onSelectObject,
        platform,
      }),
    [
      id,
      object,
      viewMode,
      previewOptions,
      onSelectObject,
      settings,
      settings?.debug,
      settings?.editorInputMode,
      settings?.folding,
      settings?.numberedHeadings,
      platform,
      settings?.typewriter,
      selectionManager,
    ],
  );

  return useMemo<Extension[]>(
    () =>
      [
        // TODO(burdon): Pass this in?
        // NOTE: Data extensions must be first so that automerge is updated before other extensions compute their state.
        target &&
          createDataExtensions({
            id,
            text: createDocAccessor(target, ['content']),
            messenger: space,
            identity,
          }),

        // TODO(burdon): Reconcile with effect in parent.
        Obj.instanceOf(Markdown.Document, object) &&
          listener({
            onChange: ({ text }) => {
              setFallbackName(object as Markdown.Document, text);
            },
          }),

        baseExtensions,
        selectionState(editorStateStore),
      ].filter(isTruthy),
    [identity, space, id, object, target, baseExtensions],
  );
};

/**
 * Create extension instances for editor.
 */
const createBaseExtensions = ({
  id,
  object,
  onSelectObject,
  settings,
  selectionManager,
  viewMode,
  previewOptions,
  platform,
}: ExtensionsOptions): Extension[] => {
  const extensions: Extension[] = [
    selectionManager && selectionChange(selectionManager),
    settings?.editorInputMode && InputModeExtensions[settings.editorInputMode],
    settings?.folding && platform !== 'mobile' && folding(),
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
          numberedHeadings: settings?.numberedHeadings ? { from: 2 } : undefined,
          // TODO(wittjosiah): For internal links render the label of the object.
          renderLinkButton: onSelectObject && createRenderLink(onSelectObject),
        }),
        linkTooltip(renderLinkTooltip),
        preview(previewOptions),
        replacer(),
      ],
    );
  }

  if (settings?.debug) {
    const items = settings.typewriter?.split(/[,\n]/) ?? '';
    if (items) {
      extensions.push(typewriter({ items }));
    }
  }

  return extensions;
};

const selectionChange = (selectionManager: SelectionManager) => {
  const debouncedHandler = debounceAndThrottle((update: ViewUpdate) => {
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
  }, 100);

  return EditorView.updateListener.of((update: ViewUpdate) => {
    if (update.selectionSet) {
      debouncedHandler(update);
    }
  });
};

const createRenderLink =
  (onSelectObject: (id: string) => void): RenderCallback<{ url: string }> =>
  (el, { url }) => {
    // TODO(burdon): Formalize/document internal link format.
    const isInternal = url.startsWith('/') || url.startsWith(window.location.origin);
    const qualifiedId = isInternal ? fromUrlPath(new URL(url, window.location.origin).pathname) : undefined;
    const icon = Domino.of('span')
      .classNames('dx-link ms-1 inline-block align-[-0.125em]')
      .children(Domino.svg(isInternal ? 'ph--arrow-square-down--regular' : 'ph--arrow-square-out--regular'));

    if (isInternal) {
      invariant(qualifiedId, 'Invalid link format.');
      icon
        .attributes({ role: 'button', tabindex: '0' })
        .on('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          onSelectObject(qualifiedId);
        })
        .on('keydown', (event) => {
          const keyboardEvent = event as KeyboardEvent;
          if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') {
            return;
          }

          keyboardEvent.preventDefault();
          keyboardEvent.stopPropagation();
          onSelectObject(qualifiedId);
        });
    }

    el.appendChild(icon.root);
  };

const renderLinkTooltip: RenderCallback<{ url: string }> = (el, { url }) => {
  el.appendChild(
    Domino.of('a')
      .attributes({ href: url, target: '_blank', rel: 'noreferrer' })
      .classNames('dx-link flex items-center gap-2')
      .text(safeUrl(url)?.toString() ?? url)
      .children(Domino.svg('ph--arrow-square-out--regular')).root,
  );
};
