//
// Copyright 2025 DXOS.org
//

import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';

import { Icon, type ThemedClassName, ThemeProvider, useDynamicRef, useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { defaultTx, mx } from '@dxos/react-ui-theme';

import { multiselect, type MultiselectItem, type MultiselectOptions } from './extension';

export type MultiselectProps = ThemedClassName<
  { items: MultiselectItem[] } & Pick<MultiselectOptions, 'onSelect' | 'onSearch' | 'onUpdate'>
>;

export const Multiselect = ({ items, classNames, onUpdate, ...props }: MultiselectProps) => {
  const { themeMode } = useThemeContext();

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
          // slots: {
          //   editor: {
          //     className: 'overflow-x-auto',
          //   },
          // },
        }),
        multiselect({ renderIcon, onUpdate: handleUpdate, ...props }),
      ],
    }),
    [themeMode],
  );

  // TODO(burdon): This will cancel current autocomplete; need CRDT?
  useEffect(() => {
    view?.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: createLinks(items) } });
  }, [view, items]);

  return <div ref={parentRef} className={mx('w-full', classNames)} />;
};

const createLinks = (items: MultiselectItem[]) => {
  return items.map(({ id, label }) => `[${label}](${id})`).join('');
};

const renderIcon = (el: Element, icon: string, onClick: () => void) => {
  createRoot(el).render(
    <ThemeProvider tx={defaultTx}>
      <Icon icon={icon} classNames='inline-block p-0' size={3} onClick={onClick} />
    </ThemeProvider>,
  );
};
