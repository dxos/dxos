//
// Copyright 2025 DXOS.org
//

import React, { type CSSProperties, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { useResizeDetector } from 'react-resize-detector';

import { type ThemedClassName, ThemeProvider, useDynamicRef, useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { defaultTx, mx } from '@dxos/react-ui-theme';

import { Pill } from './Pill';
import { createLinks, multiselect, type MultiselectItem, type MultiselectOptions } from './extension';

export type MultiselectProps = ThemedClassName<
  { items: MultiselectItem[]; readonly?: boolean } & Pick<MultiselectOptions, 'onSelect' | 'onSearch' | 'onUpdate'>
>;

export const Multiselect = ({ readonly, ...props }: MultiselectProps) => {
  if (readonly) {
    return <ReadonlyMultiselect {...props} />;
  } else {
    return <EditableMultiselect {...props} />;
  }
};

const ReadonlyMultiselect = ({ classNames, items, onSelect }: MultiselectProps) => {
  return (
    <div className={mx('flex h-[2rem] items-center', classNames)}>
      {items.map((item) => (
        <span key={item.id} className='px-[2px]'>
          <Pill item={item} onSelect={(item) => onSelect?.(item.id)} />
        </span>
      ))}
    </div>
  );
};

const EditableMultiselect = ({ classNames, items, readonly, onUpdate, ...props }: MultiselectProps) => {
  const { themeMode } = useThemeContext();
  const { ref, width } = useResizeDetector();

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
        multiselect({
          debug: true,
          render: (el, props) => {
            createRoot(el).render(
              <ThemeProvider tx={defaultTx}>
                <Pill {...props} />
              </ThemeProvider>,
            );
          },
          onUpdate: handleUpdate,
          ...props,
        }),
      ],
    }),
    [themeMode],
  );

  useEffect(() => {
    const text = createLinks(items);
    if (text !== view?.state.doc.toString()) {
      // TODO(burdon): This will cancel any current autocomplete; need to merge?
      view?.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
    }
  }, [view, items]);

  return (
    <div ref={ref} className='w-full'>
      <div
        ref={parentRef}
        style={{ width, '--dx-multiselectWidth': `${width}px` } as CSSProperties}
        className='w-full'
      />
    </div>
  );
};
