//
// Copyright 2023 DXOS.org
//

import { type ViewUpdate } from '@codemirror/view';
import { useMemo } from 'react';

import { Paths } from '@dxos/app-toolkit';
import { debounceAndThrottle } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { invariant } from '@dxos/invariant';
import { getSpace, useObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useThemeContext } from '@dxos/react-ui';
import { type ViewStateManager, selectionAspect } from '@dxos/react-ui-attention';
import { Text } from '@dxos/schema';
import { Domino } from '@dxos/ui';
import {
  AnchorWidget,
  Cursor,
  type EditorStateStore,
  EditorView,
  type Extension,
  InputModeExtensions,
  type XmlWidgetProps,
  type XmlWidgetState,
  createDataExtensions,
  decorateMarkdown,
  documentId,
  folding,
  formattingKeymap,
  linkTooltip,
  listener,
  replacer,
  selectionState,
  snippets,
  xmlTags,
} from '@dxos/ui-editor';
import { type EditorViewMode, type RenderCallback } from '@dxos/ui-editor/types';
import { isTruthy, safeUrl } from '@dxos/util';

import { Markdown } from '#types';

import { PreviewComponent, type PreviewComponentProps } from '../components/PreviewComponent/PreviewComponent';
import { setFallbackName } from '../util';

export type DocumentType = Markdown.Document | Text.Text | { id: string; text: string };

export type ExtensionsOptions = {
  id: string;
  object?: DocumentType;
  settings?: Markdown.Settings;
  compact?: boolean;
  viewMode?: EditorViewMode;
  editable?: boolean;
  viewState?: ViewStateManager;
  editorStateStore?: EditorStateStore;
  setWidgets?: (widgets: XmlWidgetState[]) => void;
  platform?: 'mobile' | 'desktop';
  /** Callback when an internal link is clicked. */
  onSelectObject?: (objectId: string) => void;
};

// TODO(burdon): Merge with createBaseExtensions below.
export const useExtensions = ({
  id,
  object,
  settings,
  compact,
  viewMode,
  viewState,
  editorStateStore,
  setWidgets,
  onSelectObject,
}: ExtensionsOptions): Extension[] => {
  const { platform } = useThemeContext();
  const identity = useIdentity();
  const space = getSpace(object);

  // Get the content reference from Document objects.
  const contentRef = Obj.instanceOf(Markdown.Document, object) ? (object as Markdown.Document).content : undefined;
  // Use useObject to trigger re-render when the reference loads (returns snapshot for reactivity).
  useObject(contentRef);
  // Get the actual live object target via .target (needed for Doc.createAccessor).
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
        space,
        settings,
        compact,
        viewMode,
        viewState,
        setWidgets,
        platform,
        onSelectObject,
      }),
    [
      id,
      object,
      space,
      compact,
      viewMode,
      viewState,
      setWidgets,
      settings,
      settings?.debug,
      settings?.editorInputMode,
      settings?.folding,
      settings?.numberedHeadings,
      platform,
      onSelectObject,
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
            text: Doc.createAccessor(target, ['content']),
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
  space,
  onSelectObject,
  settings,
  compact,
  viewMode,
  viewState,
  setWidgets,
  platform,
}: ExtensionsOptions & { space?: Space }): Extension[] => {
  const extensions: Extension[] = [
    viewState && selectionChange(viewState),
    settings?.editorInputMode && InputModeExtensions[settings.editorInputMode],
    settings?.folding && !compact && platform !== 'mobile' && folding(),
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
          // xmlTags() handles dxn:/echo: links via url-scheme widgets; skip here to avoid double-processing.
          skip: ({ url }) => url.startsWith('dxn:') || url.startsWith('echo:'),
        }),
        linkTooltip(renderLinkTooltip),
        xmlTags({
          registry: {
            'dxn-preview': {
              block: true,
              urlSchemes: ['dxn:', 'echo:'],
              Component: (props: Omit<PreviewComponentProps, 'space'>) => <PreviewComponent {...props} space={space} />,
            },
            'link-preview': {
              block: false,
              urlSchemes: ['dxn:', 'echo:'],
              factory: ({ label, dxn }: XmlWidgetProps<{ label: string; dxn: string }>) =>
                label && dxn ? new AnchorWidget(label, dxn) : null,
            },
          },
          setWidgets,
        }),
        replacer(),
      ],
    );
  }

  if (settings?.debug) {
    const items = settings.snippets?.split(/[,\n]/) ?? '';
    if (items) {
      extensions.push(snippets({ items }));
    }
  }

  return extensions;
};

const selectionChange = (viewState: ViewStateManager) => {
  const debouncedHandler = debounceAndThrottle((update: ViewUpdate) => {
    const id = update.state.facet(documentId);
    const cursorConverter = update.state.facet(Cursor.converter);
    const selection = update.state.selection;
    // NOTE: Filter on numeric offsets BEFORE converting to cursor strings.
    // Cursors are opaque (Automerge-encoded), so a lexicographic `to > from`
    // comparison is nondeterministic — it would let some cursor-placements
    // (where from === to numerically) through and reject genuine selections
    // depending on encoding, which made the comment button's enabled state
    // appear random across different lines.
    const ranges = selection.ranges
      .filter((range) => range.to > range.from)
      .map((range) => ({
        from: cursorConverter.toCursor(range.from),
        to: cursorConverter.toCursor(range.to),
      }));

    viewState.set(selectionAspect, id, { mode: 'multi-range', ranges });
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
    const qualifiedId = isInternal ? Paths.fromUrlPath(new URL(url, window.location.origin).pathname) : undefined;
    const icon = Domino.of('span')
      .classNames('dx-link ms-1 inline-block align-[-0.125em]')
      .append(Domino.svg(isInternal ? 'ph--arrow-square-down--regular' : 'ph--arrow-square-out--regular'));

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
      .append(Domino.svg('ph--arrow-square-out--regular')).root,
  );
};
