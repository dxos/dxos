//
// Copyright 2025 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import React, { type CSSProperties, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
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

import { TagPickerItem } from './TagPickerItem';
import {
  type TagPickerItemData,
  type TagPickerMode,
  type TagPickerOptions,
  createLinks,
  tagPickerExtension,
} from './extension';
import { translationKey } from '../../translations';

export type TagPickerProps = ThemedClassName<
  {
    items?: TagPickerItemData[];
    readonly?: boolean;
    mode?: TagPickerMode;
    placeholder?: string;
  } & Pick<TagPickerOptions, 'onBlur' | 'onSelect' | 'onSearch' | 'onUpdate'>
>;

export interface TagPickerHandle {
  focus: () => void;
}

export const TagPicker = forwardRef<TagPickerHandle, TagPickerProps>(({ readonly, ...props }, ref) => {
  if (readonly) {
    return <ReadonlyTagPicker {...props} />;
  } else {
    return <EditableTagPicker ref={ref} {...props} />;
  }
});

TagPicker.displayName = 'TagPicker';

const ReadonlyTagPicker = ({ items, onSelect }: TagPickerProps) => {
  const handleItemClick = useCallback(
    ({ itemId, action }: DxTagPickerItemClick) => {
      if (action === 'activate') {
        onSelect?.(itemId);
      }
    },
    [onSelect],
  );
  return (
    <>
      {items?.map((item) => (
        <TagPickerItem
          key={item.id}
          itemId={item.id}
          label={item.label}
          {...(item.hue ? { hue: item.hue } : {})}
          onItemClick={handleItemClick}
          rootClassName='mie-1'
        />
      ))}
    </>
  );
};

const EditableTagPicker = forwardRef<TagPickerHandle, TagPickerProps>(
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
          createMarkdownExtensions({ themeMode }),
          createThemeExtensions({
            themeMode,
            slots: {
              editor: {
                className: mx(classNames),
              },
            },
          }),
          tagPickerExtension({
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
        className='min-is-0 flex-1'
        style={{ '--dx-tag-picker-width': `${width}px` } as CSSProperties}
      />
    );
  },
);
