//
// Copyright 2025 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import React, { type CSSProperties, useCallback, useEffect } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import '@dxos/lit-ui/dx-tag-picker.pcss';
import { type DxTagPickerItemClick } from '@dxos/lit-ui';
import { type ThemedClassName, useDynamicRef, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { TagPickerItem } from './TagPickerItem';
import { createLinks, tagPickerExtension, type TagPickerItemData, type TagPickerOptions } from './extension';
import { translationKey } from '../translations';

export type MultiselectProps = ThemedClassName<
  { items: TagPickerItemData[]; readonly?: boolean } & Pick<TagPickerOptions, 'onSelect' | 'onSearch' | 'onUpdate'>
>;

export const TagPicker = ({ readonly, ...props }: MultiselectProps) => {
  if (readonly) {
    return <ReadonlyTagPicker {...props} />;
  } else {
    return <EditableTagPicker {...props} />;
  }
};

const ReadonlyTagPicker = ({ items, onSelect }: MultiselectProps) => {
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
      {items.map((item) => (
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

const EditableTagPicker = ({ classNames, items, readonly, onUpdate, ...props }: MultiselectProps) => {
  const { themeMode } = useThemeContext();
  const { ref: resizeRef, width } = useResizeDetector();
  const { t } = useTranslation(translationKey);

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
        createBasicExtensions({ lineWrapping: false }),
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
          ...props,
        }),
      ],
    }),
    [themeMode],
  );

  const ref = useComposedRefs(resizeRef, parentRef);

  useEffect(() => {
    const text = createLinks(items);
    if (text !== view?.state.doc.toString()) {
      // TODO(burdon): This will cancel any current autocomplete; need to merge?
      view?.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
    }
  }, [view, items]);

  return (
    <div ref={ref} className='min-is-0 flex-1' style={{ '--dx-multiselectWidth': `${width}px` } as CSSProperties} />
  );
};
