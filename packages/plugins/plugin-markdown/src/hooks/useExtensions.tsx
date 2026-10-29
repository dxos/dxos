//
// Copyright 2023 DXOS.org
//

import { type ViewUpdate } from '@codemirror/view';
import React, { useMemo } from 'react';

import { debounceAndThrottle } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { type Identity } from '@dxos/halo';
import { EID } from '@dxos/keys';
import { getSpace } from '@dxos/react-client/echo';
import { Selection, ViewState } from '@dxos/react-ui-attention/types';
import * as Hooks from '@dxos/react-ui/Hooks';
import { Text } from '@dxos/schema';
import { Domino } from '@dxos/ui';
import {
  AnchorWidget,
  Cursor,
  EditorState,
  type EditorStateStore,
  EditorView,
  type Extension,
  InputModeExtensions,
  type ObjectLinkProps,
  type WidgetHostOptions,
  createDataExtensions,
  decorateMarkdown,
  documentId,
  folding,
  formattingKeymap,
  listener,
  objectLinks,
  selectionState,
  snippets,
  substitutions,
  widgetHost,
} from '@dxos/ui-editor';
import { type EditorViewMode, type RenderCallback } from '@dxos/ui-editor/types';
import { isTruthy, safeUrl } from '@dxos/util';

import { Markdown } from '#types';

import { parseEmbedLabel } from '../components/PreviewComponent/parse-embed-label.ts';
import { PreviewComponent } from '../components/PreviewComponent/PreviewComponent.tsx';
import { setFallbackName } from '../util.tsx';
import { type DocumentContent } from './useDocumentContent.ts';

export type DocumentType = Markdown.Document | Text.Text | { id: string; text: string };

export type ExtensionsOptions = {
  id: string;
  /** The editor's attendable id; embeds nest under it so the document stays an attention ancestor. */
  attendableId?: string;
  object?: DocumentType;
  /** The object's content binding, from `useDocumentContent`. */
  content: DocumentContent;
  settings?: Markdown.Settings;
  compact?: boolean;
  viewMode?: EditorViewMode;
  editable?: boolean;
  platform?: 'mobile' | 'desktop';
  viewState?: ViewState.Manager;
  editorStateStore?: EditorStateStore;
  /**
   * Local identity for collaboration awareness. Optional so the editor can bind to a raw ECHO object
   * with no client (awareness only activates when both a space and an identity are present).
   */
  identity?: Identity.Info | null;
  setWidgets?: WidgetHostOptions['setWidgets'];
  /**
   * Callback when an internal link is clicked, with the link's URL pathname - resolving one to a node
   * walks the app graph, which only a container may reach. `modifiers.shift` reflects the originating
   * click/keydown event, so callers can invert the deck's navigation disposition.
   */
  onSelectLink?: (pathname: string, modifiers?: { shift: boolean }) => void;
};

/**
 * The CodeMirror extensions for a document: data binding to its content, the markdown decorations,
 * object-link widgets (embeds nest under `attendableId`), and the settings-driven extras.
 */
// TODO(burdon): Merge with createBaseExtensions below.
export const useExtensions = ({
  id,
  attendableId,
  object,
  content,
  settings,
  compact,
  viewMode,
  viewState,
  editorStateStore,
  identity,
  setWidgets,
  onSelectLink,
}: ExtensionsOptions): Extension[] => {
  const platform = Hooks.usePlatform();
  const space = getSpace(object);

  const target = content.target;

  // TODO(wittjosiah): Autocomplete is not working and this query is causing performance issues.
  // TODO(burdon): Unsubscribe.
  // const query = space?.db.query(Filter.type(DocumentType));
  // query?.subscribe();

  const baseExtensions = useMemo(
    () =>
      createBaseExtensions({
        id,
        attendableId,
        object,
        space,
        settings,
        compact,
        viewMode,
        viewState,
        platform,
        setWidgets,
        onSelectLink,
      }),
    [
      id,
      attendableId,
      object,
      space,
      compact,
      viewMode,
      viewState,
      platform,
      setWidgets,
      settings,
      settings?.debug,
      settings?.editorInputMode,
      settings?.folding,
      settings?.numberedHeadings,
      onSelectLink,
    ],
  );

  // No persistence binding yet (loading, missing or deleted content).
  const contentPending = content.status !== undefined;

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

        // Never editable before the binding: input typed into an unbound editor lives only in
        // CodeMirror state, which the automerge extension's attach-reconcile then replaces wholesale
        // with the loaded value. `editable(false)` as well as the advisory `readOnly`, so the DOM is
        // not contenteditable and a caller's editability wait holds.
        contentPending && [EditorState.readOnly.of(true), EditorView.editable.of(false)],

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
    [identity, space, id, object, target, contentPending, baseExtensions],
  );
};

/**
 * Create extension instances for editor.
 */
const createBaseExtensions = ({
  id,
  attendableId,
  object,
  space,
  onSelectLink,
  settings,
  compact,
  viewMode,
  viewState,
  setWidgets,
  platform,
}: Omit<ExtensionsOptions, 'content'> & { space?: Space }): Extension[] => {
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
          renderLinkButton: onSelectLink && createRenderLink(onSelectLink),
        }),
        widgetHost({ setWidgets }),
        objectLinks({
          link: {
            factory: ({ label, eid }: ObjectLinkProps) => {
              // TODO(burdon): Why support both "#" or "@"?
              // A bare `#`/`@` label is a name-less link; resolve the object's actual label once
              // loaded. The resolver is only created when a db exists so `AnchorWidget.eq` sees the
              // db's arrival as a change and rebuilds the chip.
              const resolver =
                ['#', '@'].indexOf(label) !== -1 && space?.db ? createAnchorLabelResolver(space.db, eid) : undefined;

              return new AnchorWidget(label, eid, undefined, resolver);
            },
          },
          image: {
            // Reserve the persisted height (`![label|404](...)`) up front so the block does not collapse
            // to the placeholder minimum while the embed resolves (prevents scroll jitter / blank).
            estimatedHeight: ({ label }: ObjectLinkProps) => (label ? parseEmbedLabel(label).height : undefined),
            // An embed that released its reserved height (a card) must still keep its element across
            // rebuilds, or a click that reconfigures the editor remounts it out from under the user.
            keepAlive: true,
            Component: (props) => <PreviewComponent {...props} db={space?.db} attendableId={attendableId} />,
          },
        }),
        substitutions(),
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

const selectionChange = (viewState: ViewState.Manager) => {
  const debouncedHandler = debounceAndThrottle((update: ViewUpdate) => {
    const id = update.state.facet(documentId);
    const cursorConverter = update.state.facet(Cursor.converter);
    const selection = update.state.selection;
    // NOTE: Filter on numeric offsets BEFORE converting to cursor strings.
    // Cursors are opaque (Automerge-encoded), so a lexicographic `to > from`
    // comparison is nondeterministic - it would let some cursor-placements
    // (where from === to numerically) through and reject genuine selections
    // depending on encoding, which made the comment button's enabled state
    // appear random across different lines.
    const ranges = selection.ranges
      .filter((range) => range.to > range.from)
      .map((range) => ({
        from: cursorConverter.toCursor(range.from),
        to: cursorConverter.toCursor(range.to),
      }));

    viewState.set(Selection.aspect, id, { mode: 'multi-range', ranges });
  }, 100);

  return EditorView.updateListener.of((update: ViewUpdate) => {
    if (update.selectionSet) {
      debouncedHandler(update);
    }
  });
};

/** Resolves an anchor's display label from the linked object (for name-less `#`/`@` links). */
const createAnchorLabelResolver = (db: Space['db'], eid: string) => async () => {
  const parsed = EID.tryParse(eid);
  if (!parsed) {
    return undefined;
  }
  try {
    const object = await db.makeRef(parsed).load();
    return Obj.getLabel(object as Obj.Unknown) ?? undefined;
  } catch {
    return undefined;
  }
};

const createRenderLink =
  (onSelectLink: (pathname: string, modifiers?: { shift: boolean }) => void): RenderCallback<{ url: string }> =>
  (el, { url }) => {
    // TODO(burdon): Formalize/document internal link format.
    const isInternal = url.startsWith('/') || url.startsWith(window.location.origin);
    // An external link's icon is itself a link, since a click on the link text only places the caret in the editor;
    // only a web URL, so document text cannot plant a `javascript:` href.
    const href = isInternal ? undefined : safeUrl(url);
    const web = href?.protocol === 'http:' || href?.protocol === 'https:';
    const icon = Domino.of(web ? 'a' : 'span')
      .classNames('dx-link-accent ms-1 inline-block align-[-0.125em]')
      .append(Domino.svg(isInternal ? 'ph--arrow-square-down--regular' : 'ph--arrow-square-out--regular'));
    if (web) {
      icon.attributes({ 'href': href.toString(), 'target': '_blank', 'rel': 'noreferrer', 'aria-label': 'Open link' });
    }

    if (isInternal) {
      const pathname = new URL(url, window.location.origin).pathname;

      icon
        .attributes({ role: 'button', tabindex: '0' })
        .on('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          onSelectLink(pathname, { shift: event.shiftKey });
        })
        .on('keydown', (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          onSelectLink(pathname, { shift: event.shiftKey });
        });
    }

    el.appendChild(icon.root);
  };
