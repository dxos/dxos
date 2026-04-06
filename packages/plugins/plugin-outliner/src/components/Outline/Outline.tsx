//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import { composeRefs } from '@radix-ui/react-compose-refs';
import { createContext } from '@radix-ui/react-context';
import React, {
  type RefObject,
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';

import { createDocAccessor } from '@dxos/echo-db';
import { useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  type EditorMenuGroup,
  EditorMenuProvider,
  type EditorMenuProviderProps,
  type UseTextEditorProps,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { type Text } from '@dxos/schema';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  deleteItem,
  hashtag,
  outliner,
} from '@dxos/ui-editor';
import { composable, composableProps } from '@dxos/ui-theme';

import { meta } from '../../meta';

//
// Controller
//

type OutlineController = {
  focus: () => void;
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
  } & Pick<UseTextEditorProps, 'autoFocus'>
>;

const OutlineRoot = forwardRef<OutlineController, OutlineRootProps>(
  ({ children, text, id, autoFocus, scrollable = true, showSelected = true }, forwardedRef) => {
    const viewRef = useRef<EditorView | undefined>(undefined);

    useImperativeHandle(
      forwardedRef,
      () => ({
        focus: () => viewRef.current?.focus(),
      }),
      [],
    );

    return (
      <OutlineContextProvider
        id={id}
        text={text}
        scrollable={scrollable}
        showSelected={showSelected}
        autoFocus={autoFocus}
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
  const { id, text, scrollable, showSelected, autoFocus, viewRef } = useOutlineContext(OUTLINE_CONTENT_NAME);
  const { t } = useTranslation(meta.id);
  const { themeMode } = useThemeContext();

  const { parentRef, focusAttributes, view } = useTextEditor(
    () => ({
      id,
      autoFocus,
      selection: EditorSelection.cursor(text.content.length),
      initialValue: text.content,
      extensions: [
        createDataExtensions({ id, text: createDocAccessor(text, ['content']) }),
        createBasicExtensions({ readOnly: false, search: true }),
        createMarkdownExtensions(),
        createThemeExtensions({
          themeMode,
          slots: {
            scroll: { className: scrollable ? '' : '!overflow-hidden' },
          },
        }),
        outliner({ showSelected }),
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
    [t],
  );

  const handleSelect = useCallback<NonNullable<EditorMenuProviderProps['onSelect']>>(({ view, item }) => {
    if (view && item.onSelect) {
      return item.onSelect({ view, head: view.state.selection.main.head });
    }
  }, []);

  return (
    <EditorMenuProvider view={view} groups={commandGroups} onSelect={handleSelect}>
      <div {...composableProps(props, focusAttributes)} ref={composeRefs(parentRef, forwardedRef)}>
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

export type { OutlineController, OutlineRootProps, OutlineContentProps };
