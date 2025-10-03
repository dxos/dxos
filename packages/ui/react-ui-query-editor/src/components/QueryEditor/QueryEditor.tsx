//
// Copyright 2025 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import React, {
  type CSSProperties,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { useResizeDetector } from 'react-resize-detector';

import '@dxos/lit-ui/dx-tag-picker.pcss';
import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import {
  type CommandMenuGroup,
  type CommandMenuItem,
  CommandMenuProvider,
  EditorView,
  createBasicExtensions,
  createThemeExtensions,
  useCommandMenu,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import {
  type QueryEditorExtensionProps,
  type QueryItem,
  type QueryTag,
  itemIsTag,
  itemIsText,
  parseQueryItems,
  queryEditor,
  renderItems,
  renderTag,
} from './query-editor-extension';
import { QueryEditorItem } from './QueryEditorItem';

export type QueryEditorProps = ThemedClassName<{
  initialItems?: QueryItem[];
  readonly?: boolean;
  placeholder?: string;
  onSearch?: (text: string, ids: string[]) => QueryTag[];
  onBlur?: (event: FocusEvent) => void;
}> &
  QueryEditorExtensionProps;

export interface QueryEditorHandle {
  focus: () => void;
}

export const QueryEditor = forwardRef<QueryEditorHandle, QueryEditorProps>(({ readonly, ...props }, ref) => {
  if (readonly) {
    return <ReadonlyQueryEditor {...props} />;
  } else {
    return <EditableQueryEditor ref={ref} {...props} />;
  }
});

QueryEditor.displayName = 'QueryEditor';

const ReadonlyQueryEditor = ({ classNames, initialItems }: QueryEditorProps) => {
  return (
    <div className={mx(classNames)}>
      {initialItems?.map((item) => {
        if (itemIsTag(item)) {
          return (
            <QueryEditorItem
              key={item.id}
              itemId={item.id}
              label={item.label}
              {...(item.hue ? { hue: item.hue } : {})}
              rootClassName='mie-1'
            />
          );
        } else if (itemIsText(item)) {
          return (
            <span key={item.content} className='mie-1'>
              {item.content}
            </span>
          );
        } else {
          return null;
        }
      })}
    </div>
  );
};

const EditableQueryEditor = forwardRef<QueryEditorHandle, QueryEditorProps>(
  ({ classNames, initialItems = [], placeholder, onSearch, onBlur, onChange }, ref) => {
    const { themeMode } = useThemeContext();
    const { ref: resizeRef, width } = useResizeDetector();
    const viewRef = useRef<EditorView | null>(null);

    const getMenu = useCallback(
      async (trigger: string, query?: string): Promise<CommandMenuGroup[]> => {
        if (trigger === '#' && onSearch) {
          const currentIds = viewRef?.current?.state
            ? parseQueryItems(viewRef.current.state)
                .filter(itemIsTag)
                .map((item) => item.id)
            : [];
          const results = onSearch(query || '', currentIds);
          const menuItems: CommandMenuItem[] = results.map((item) => ({
            id: item.id,
            label: item.label,
            onSelect: (view: EditorView) => {
              const newItem = renderTag(item);
              const selection = view.state.selection.main;
              view.dispatch({
                changes: { from: selection.from, to: selection.to, insert: newItem },
                selection: { anchor: selection.from + newItem.length },
              });
            },
          }));
          return [{ id: 'query-items', items: menuItems }];
        }
        return [];
      },
      [onSearch],
    );

    const {
      commandMenu: commandMenuExtension,
      groupsRef,
      ...commandMenuProps
    } = useCommandMenu({
      viewRef,
      trigger: '#',
      getMenu,
    });

    const queryEditorExtension = useMemo(() => queryEditor({ onChange }), [onChange]);

    // TODO(thure): In theory, `commandMenuExtension` should be a dependency, but it seems to change overly often in
    //  certain scenarios; debug this if needed.
    const { parentRef, view } = useTextEditor(() => {
      return {
        initialValue: renderItems(initialItems),
        extensions: [
          createBasicExtensions({ lineWrapping: false, placeholder }),
          createThemeExtensions({
            themeMode,
            slots: {
              editor: { className: 'is-full' },
              content: { className: '!text-sm' },
            },
          }),
          commandMenuExtension,
          queryEditorExtension,
          EditorView.domEventHandlers({
            blur: (event) => onBlur?.(event),
          }),
        ],
      };
    }, [themeMode, onBlur]);

    const composedRef = useComposedRefs(resizeRef, parentRef);
    useImperativeHandle(ref, () => ({ focus: () => view?.focus() }), [view]);

    useEffect(() => {
      viewRef.current = view;
    }, [view]);

    useEffect(() => () => console.log('[query editor unmount]'), []);

    return (
      <CommandMenuProvider groups={groupsRef.current} {...commandMenuProps}>
        <div
          ref={composedRef}
          className={mx('min-is-0 grow', classNames)}
          style={{ '--dx-query-editor-width': `${width}px` } as CSSProperties}
        />
      </CommandMenuProvider>
    );
  },
);
