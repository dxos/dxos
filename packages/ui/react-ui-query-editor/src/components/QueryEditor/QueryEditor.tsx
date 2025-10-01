//
// Copyright 2025 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import React, { type CSSProperties, forwardRef, useCallback, useEffect, useImperativeHandle } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import '@dxos/lit-ui/dx-tag-picker.pcss';
import { type DxTagPickerItemClick } from '@dxos/lit-ui';
import { type ThemedClassName, useDynamicRef, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  EditorView,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { translationKey } from '../../translations';

import {
  type QueryEditorItemData,
  type QueryEditorMode,
  type QueryEditorOptions,
  createLinks,
  queryEditor,
} from './query-editor-extension';
import { QueryEditorItem } from './QueryEditorItem';

export type QueryEditorProps = ThemedClassName<
  {
    items?: QueryEditorItemData[];
    readonly?: boolean;
    mode?: QueryEditorMode;
    placeholder?: string;
  } & Pick<QueryEditorOptions, 'onBlur' | 'onSelect' | 'onSearch' | 'onUpdate'>
>;

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

const ReadonlyQueryEditor = ({ classNames, items, onSelect }: QueryEditorProps) => {
  const handleItemClick = useCallback(
    ({ itemId, action }: DxTagPickerItemClick) => {
      if (action === 'activate') {
        onSelect?.(itemId);
      }
    },
    [onSelect],
  );

  return (
    <div className={mx(classNames)}>
      {items?.map((item) => (
        <QueryEditorItem
          key={item.id}
          itemId={item.id}
          label={item.label}
          {...(item.hue ? { hue: item.hue } : {})}
          rootClassName='mie-1'
          onItemClick={handleItemClick}
        />
      ))}
    </div>
  );
};

const EditableQueryEditor = forwardRef<QueryEditorHandle, QueryEditorProps>(
  ({ classNames, items = [], mode, placeholder, onBlur, onUpdate, onSearch, onSelect }, ref) => {
    const { t } = useTranslation(translationKey);
    const { themeMode } = useThemeContext();
    const { ref: resizeRef, width } = useResizeDetector();

    const itemsRef = useDynamicRef(items);
    const handleUpdate = (ids: string[]) => {
      const modified = ids.length !== itemsRef.current.length || ids.some((id, i) => id !== itemsRef.current[i].id);
      if (modified) {
        onUpdate?.(ids);
      }
    };

    const { parentRef, view } = useTextEditor(
      () => ({
        initialValue: createLinks(items),
        extensions: [
          createBasicExtensions({ lineWrapping: false, placeholder }),
          // TODO(burdon): Limit to tags.
          createMarkdownExtensions(),
          createThemeExtensions({
            themeMode,
            slots: {
              editor: { className: 'is-full' },
              content: { className: '!text-sm' },
            },
          }),
          queryEditor({
            debug: true,
            onUpdate: handleUpdate,
            removeLabel: t('remove label'),
            mode,
            onSearch,
            onSelect,
          }),
          EditorView.domEventHandlers({
            blur: (event) => onBlur?.(event),
          }),
        ],
      }),
      [themeMode, mode, onSearch, onSelect, onBlur],
    );

    const composedRef = useComposedRefs(resizeRef, parentRef);
    useImperativeHandle(ref, () => ({ focus: () => view?.focus() }), [view]);

    useEffect(() => {
      const text = createLinks(items);
      if (text !== view?.state.doc.toString()) {
        // TODO(burdon): This will cancel any current autocomplete; need to merge?
        view?.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
      }
    }, [view, items]);

    return (
      <div
        ref={composedRef}
        className={mx('min-is-0 grow', classNames)}
        style={{ '--dx-query-editor-width': `${width}px` } as CSSProperties}
      />
    );
  },
);
