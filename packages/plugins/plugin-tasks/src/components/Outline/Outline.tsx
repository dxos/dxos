//
// Copyright 2025 DXOS.org
//

import { EditorSelection, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import React, {
  type PropsWithChildren,
  type RefObject,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Doc } from '@dxos/echo-doc';
import { composeRefs, createContext } from '@dxos/react-hooks';
import { composable, composableProps, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  type EditorMenuGroup,
  EditorMenuProvider,
  type EditorMenuProviderProps,
  type UseTextEditorProps,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { type Text } from '@dxos/schema';
import {
  AnchorWidget,
  type WidgetProps,
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  deleteItem,
  getItemText,
  hashtag,
  isItemLink,
  outliner,
  replaceItemWithLink,
  syncLinkLabels,
  objectLinks,
} from '@dxos/ui-editor';

import { meta } from '#meta';

/** Link inserted in place of a converted item. */
export type OutlineLink = {
  label: string;
  url: string;
};

/** Replaces the current item with a link to the object created from its text. */
const convertItemToTask = async (
  view: EditorView,
  onConvertToTask: (text: string) => Promise<OutlineLink | undefined>,
): Promise<void> => {
  const text = getItemText(view.state);
  const link = text?.trim() ? await onConvertToTask(text) : undefined;
  // The action scope is re-resolved on replace, so a caret move or edit during the await would
  // otherwise overwrite whichever item the scope now points at.
  if (link && getItemText(view.state) === text) {
    replaceItemWithLink(view, link);
  }

  view.focus();
};

//
// Controller
//

type OutlineController = {
  focus: () => void;
  /** Converts the current item; a no-op unless `onConvertToTask` is set. */
  convertToTask: () => void;
};

//
// Context
//

const OUTLINE_ROOT_NAME = 'Outline.Root';

type OutlineContextValue = {
  id: string;
  text: Text.Text;
  scrollable: boolean;
  showSelected: boolean;
  readonly?: boolean;
  autoFocus?: boolean;
  /** Reports whether the caret's item can still be promoted (an item that is already a link cannot). */
  onConvertibleChange?: (convertible: boolean) => void;
  onConvertToTask?: (text: string) => Promise<OutlineLink | undefined>;
  onSelectLink?: (url: string) => void;
  resolveLinkLabel?: (url: string) => string | undefined;
  /** Editor extensions contributed by the host (e.g. a plugin's reference decoration). */
  extensions?: Extension[];
  /** Mutable ref populated by Content so Root can expose the view via the controller. */
  viewRef: RefObject<EditorView | null | undefined>;
};

const [OutlineContextProvider, useOutlineContext] = createContext<OutlineContextValue>(OUTLINE_ROOT_NAME);

//
// Root
//

type OutlineRootProps = PropsWithChildren<
  {
    id: string;
    text: Text.Text;
    scrollable?: boolean;
    showSelected?: boolean;
    /** Presentation only: blocks edits and drops the drag grips and floating menu (e.g. a card preview). */
    readonly?: boolean;
    /** Converts an item's text into an object; the item is replaced by a link to the returned target. */
    onConvertToTask?: (text: string) => Promise<OutlineLink | undefined>;
    /**
     * Called as the caret moves with whether the item under it can be promoted — false once it is a
     * link, since converting again would orphan the object the link points at. Drives the toolbar's
     * disabled state; the editor's own menu hides the entry itself.
     */
    onConvertibleChange?: (convertible: boolean) => void;
    /** Called when the user activates a link inserted by a conversion. */
    onSelectLink?: (url: string) => void;
    /** Current label of a link's target; the document text is reconciled against it. */
    resolveLinkLabel?: (url: string) => string | undefined;
    /**
     * Editor extensions the host contributes. The outline owns its own core (outliner, markdown,
     * links); a host adds what only it knows about — e.g. plugin-github decorating `#123`.
     */
    extensions?: Extension[];
  } & Pick<UseTextEditorProps, 'autoFocus'>
>;

const OutlineRoot = forwardRef<OutlineController, OutlineRootProps>(
  (
    {
      children,
      text,
      id,
      autoFocus,
      scrollable = true,
      showSelected = true,
      readonly,
      onConvertToTask,
      onConvertibleChange,
      onSelectLink,
      resolveLinkLabel,
      extensions,
    },
    forwardedRef,
  ) => {
    const viewRef = useRef<EditorView | undefined>(undefined);

    useImperativeHandle(
      forwardedRef,
      () => ({
        focus: () => viewRef.current?.focus(),
        convertToTask: () => {
          const view = viewRef.current;
          if (view && onConvertToTask) {
            void convertItemToTask(view, onConvertToTask);
          }
        },
      }),
      [onConvertToTask],
    );

    return (
      <OutlineContextProvider
        id={id}
        text={text}
        scrollable={scrollable}
        showSelected={showSelected}
        readonly={readonly}
        onConvertibleChange={onConvertibleChange}
        autoFocus={autoFocus}
        onConvertToTask={onConvertToTask}
        onSelectLink={onSelectLink}
        resolveLinkLabel={resolveLinkLabel}
        extensions={extensions}
        viewRef={viewRef}
      >
        {children}
      </OutlineContextProvider>
    );
  },
);

OutlineRoot.displayName = OUTLINE_ROOT_NAME;

//
// Content
//

const OUTLINE_CONTENT_NAME = 'Outline.Content';

type OutlineContentProps = {};

const OutlineContent = composable<HTMLDivElement, OutlineContentProps>((props, forwardedRef) => {
  const {
    id,
    text,
    scrollable,
    showSelected,
    readonly,
    onConvertibleChange,
    autoFocus,
    onConvertToTask,
    onSelectLink,
    resolveLinkLabel,
    extensions,
    viewRef,
  } = useOutlineContext(OUTLINE_CONTENT_NAME);
  const { t } = useTranslation(meta.profile.key);
  const { themeMode } = useThemeContext();

  const { parentRef, focusAttributes, view } = useTextEditor(
    () => ({
      id,
      autoFocus,
      selection: EditorSelection.cursor(text.content.length),
      initialValue: text.content,
      extensions: [
        createDataExtensions({ id, text: Doc.createAccessor(text, ['content']) }),
        createBasicExtensions({ readOnly: !!readonly, search: true }),
        createMarkdownExtensions(),
        createThemeExtensions({
          themeMode,
          slots: {
            scroller: { className: scrollable ? '' : 'overflow-hidden!' },
          },
        }),
        outliner({ readonly }),
        EditorView.updateListener.of((update) => {
          if (update.selectionSet || update.docChanged) {
            reportConvertible.current(!isItemLink(update.state));
          }
        }),
        // Renders links to converted objects as anchor chips (which dispatch `DX_ANCHOR_ACTIVATE`).
        objectLinks(),
        hashtag(),
        // Last, so a host's decoration sees the document the outline's own extensions produced.
        extensions ?? [],
      ],
    }),
    [id, text, autoFocus, themeMode, readonly, extensions],
  );

  // Publish view to Root so the controller can access it.
  viewRef.current = view;

  // An item that is already a link cannot be promoted again (see `isItemLink`). Tracked as state
  // because both consumers render off it: this menu, and the caller's toolbar via `onConvertibleChange`.
  const [convertible, setConvertible] = useState(true);
  // Held in a ref so the editor's extensions (rebuilt only on identity/theme changes) can call the
  // latest callback without a reconfigure.
  const reportConvertible = useRef<(convertible: boolean) => void>(() => {});
  reportConvertible.current = (next: boolean) => {
    setConvertible(next);
    onConvertibleChange?.(next);
  };

  // Seed from the initial selection; subsequent changes arrive through the update listener.
  useEffect(() => {
    if (view) {
      reportConvertible.current(!isItemLink(view.state));
    }
  }, [view]);

  const commandGroups: EditorMenuGroup[] = useMemo(
    () => [
      {
        id: 'outliner-actions',
        items: [
          ...(onConvertToTask && convertible
            ? [
                {
                  id: 'convert-to-task',
                  label: t('convert-to-task.menu'),
                  onSelect: ({ view }: { view: EditorView }) => {
                    // TODO(burdon): Timeout hack since menu steals focus.
                    setTimeout(() => void convertItemToTask(view, onConvertToTask), 100);
                  },
                },
              ]
            : []),
          {
            id: 'delete-row',
            label: t('delete-row.menu'),
            onSelect: ({ view }) => {
              // TODO(burdon): Timeout hack since menu steals focus.
              setTimeout(() => {
                deleteItem(view);
                view.focus();
              }, 100);
            },
          },
        ],
      },
    ],
    [t, onConvertToTask, convertible],
  );

  const handleSelect = useCallback<NonNullable<EditorMenuProviderProps['onSelect']>>(({ view, item }) => {
    if (view && item.onSelect) {
      return item.onSelect({ view, head: view.state.selection.main.head });
    }
  }, []);

  const getView = useCallback(() => view ?? null, [view]);

  // Reconcile stale link labels whenever the resolver reports new values (targets rename independently).
  useEffect(() => {
    if (view && resolveLinkLabel) {
      syncLinkLabels(view, resolveLinkLabel);
    }
  }, [view, resolveLinkLabel]);

  // A link is followed on click or keyboard activation only. The chip's own `DxAnchorActivate`
  // also fires on hover intent (and on leave, with `state: false`), which the host's preview
  // popover answers; acting on those would follow the link on hover. The chip dispatches its
  // activate from its own click/keydown handlers, so stopping the event in capture here keeps a
  // pinned preview from opening against an outline that is about to leave.
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!root || !onSelectLink) {
      return;
    }

    const follow = (event: Event) => {
      const anchor = event.target instanceof Element ? event.target.closest('dx-anchor') : null;
      const dxn = anchor?.getAttribute('dxn');
      if (!anchor || !dxn) {
        return;
      }
      if (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onSelectLink(dxn);
    };

    root.addEventListener('click', follow, { capture: true });
    root.addEventListener('keydown', follow, { capture: true });
    return () => {
      root.removeEventListener('click', follow, { capture: true });
      root.removeEventListener('keydown', follow, { capture: true });
    };
  }, [root, onSelectLink]);

  return (
    <EditorMenuProvider getView={getView} groups={commandGroups} onSelect={handleSelect}>
      <div {...composableProps(props, focusAttributes)} ref={composeRefs(parentRef, forwardedRef, setRoot)} />
    </EditorMenuProvider>
  );
});

OutlineContent.displayName = OUTLINE_CONTENT_NAME;

//
// Outline
// https://www.radix-ui.com/primitives/docs/guides/composition
//

export const Outline = {
  Root: OutlineRoot,
  Content: OutlineContent,
};

export type { OutlineContentProps, OutlineController, OutlineRootProps };
