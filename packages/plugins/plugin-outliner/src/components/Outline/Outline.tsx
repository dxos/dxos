//
// Copyright 2025 DXOS.org
//

import { EditorSelection } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import { composeRefs } from '@radix-ui/react-compose-refs';
import { createContext } from '@radix-ui/react-context';
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
import { DX_ANCHOR_ACTIVATE, DxAnchorActivate, useThemeContext, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
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
  type XmlWidgetProps,
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  deleteItem,
  getItemText,
  hashtag,
  outliner,
  replaceItemWithLink,
  syncLinkLabels,
  xmlTags,
} from '@dxos/ui-editor';

import { meta } from '#meta';

/** Link inserted in place of a converted item. */
export type OutlineLink = {
  label: string;
  url: string;
};

const OBJECT_URL_SCHEMES = ['dxn:', 'echo:'];

/** Replaces the current item with a link to the object created from its text. */
const convertItemToTask = async (
  view: EditorView,
  onConvertToTask: (text: string) => Promise<OutlineLink | undefined>,
): Promise<void> => {
  const text = getItemText(view.state);
  const link = text?.trim() ? await onConvertToTask(text) : undefined;
  if (link) {
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
  autoFocus?: boolean;
  onConvertToTask?: (text: string) => Promise<OutlineLink | undefined>;
  onSelectLink?: (url: string) => void;
  resolveLinkLabel?: (url: string) => string | undefined;
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
    /** Converts an item's text into an object; the item is replaced by a link to the returned target. */
    onConvertToTask?: (text: string) => Promise<OutlineLink | undefined>;
    /** Called when the user activates a link inserted by a conversion. */
    onSelectLink?: (url: string) => void;
    /** Current label of a link's target; the document text is reconciled against it. */
    resolveLinkLabel?: (url: string) => string | undefined;
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
      onConvertToTask,
      onSelectLink,
      resolveLinkLabel,
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
        autoFocus={autoFocus}
        onConvertToTask={onConvertToTask}
        onSelectLink={onSelectLink}
        resolveLinkLabel={resolveLinkLabel}
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

const OutlineContent = composable<HTMLDivElement, OutlineContentProps>(({ children, ...props }, forwardedRef) => {
  const { id, text, scrollable, showSelected, autoFocus, onConvertToTask, onSelectLink, resolveLinkLabel, viewRef } =
    useOutlineContext(OUTLINE_CONTENT_NAME);
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
        createBasicExtensions({ readOnly: false, search: true }),
        createMarkdownExtensions(),
        createThemeExtensions({
          themeMode,
          slots: {
            scroller: { className: scrollable ? '' : '!overflow-hidden' },
          },
        }),
        outliner({ showSelected }),
        // Renders links to converted objects as anchor chips (which dispatch `DX_ANCHOR_ACTIVATE`).
        xmlTags({
          registry: {
            'link-preview': {
              block: false,
              urlSchemes: OBJECT_URL_SCHEMES,
              factory: ({ label, dxn }: XmlWidgetProps<{ label: string; dxn: string }>) =>
                label && dxn ? new AnchorWidget(label, dxn) : null,
            },
          },
        }),
        hashtag(),
      ],
    }),
    [id, text, autoFocus, themeMode],
  );

  // Publish view to Root so the controller can access it.
  viewRef.current = view;

  const commandGroups: EditorMenuGroup[] = useMemo(
    () => [
      {
        id: 'outliner-actions',
        items: [
          ...(onConvertToTask
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
    [t, onConvertToTask],
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

  // `DxAnchorActivate` does not bubble, so listen during capture on the editor's container.
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!root || !onSelectLink) {
      return;
    }

    const handler = (event: Event) => {
      if (event instanceof DxAnchorActivate) {
        onSelectLink(event.dxn);
      }
    };

    root.addEventListener(DX_ANCHOR_ACTIVATE, handler, { capture: true });
    return () => root.removeEventListener(DX_ANCHOR_ACTIVATE, handler, { capture: true });
  }, [root, onSelectLink]);

  return (
    <EditorMenuProvider getView={getView} groups={commandGroups} onSelect={handleSelect}>
      <div {...composableProps(props, focusAttributes)} ref={composeRefs(parentRef, forwardedRef, setRoot)}>
        {children}
      </div>
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
