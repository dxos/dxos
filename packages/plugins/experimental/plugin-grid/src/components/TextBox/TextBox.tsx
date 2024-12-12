//
// Copyright 2024 DXOS.org
//

import { Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import React, { useEffect } from 'react';

import { useThemeContext, type ThemedClassName } from '@dxos/react-ui';
import {
  type BasicExtensionsOptions,
  createBasicExtensions,
  createThemeExtensions,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

export type TextBoxProps = ThemedClassName<
  {
    value: string;
    onClose?: (value: string) => void;
    onCancel?: () => void;
  } & Pick<BasicExtensionsOptions, 'placeholder'>
>;

export const TextBox = ({ classNames, value, onClose, onCancel, ...rest }: TextBoxProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef, view, focusAttributes } = useTextEditor(() => {
    return {
      id: 'text',
      initialValue: value,
      extensions: [
        createBasicExtensions({ lineWrapping: false, ...rest }),
        createThemeExtensions({
          themeMode,
          slots: {
            editor: { className: 'overflow-hidden' },
            content: { className: 'overflow-hidden text-center [&>*]:overflow-hidden' },
          },
        }),
        EditorView.focusChangeEffect.of((state, focusing) => {
          if (!focusing) {
            // onClose?.(state.doc.toString());
          }
          return null;
        }),
        Prec.highest(
          keymap.of([
            {
              key: 'Enter',
              preventDefault: true,
              run: (view) => {
                onClose?.(view.state.doc.toString());
                return true;
              },
            },
            {
              key: 'Shift-Enter',
              run: (view) => {
                view.dispatch(view.state.replaceSelection('\n'));
                return true;
              },
            },
            {
              key: 'Escape',
              run: () => {
                onCancel?.();
                return true;
              },
            },
          ]),
        ),
      ],
    };
  }, [value]);

  useEffect(() => {
    view?.dispatch({ selection: { anchor: view.state.doc.length } });
    view?.focus();
  }, [view]);

  return <div ref={parentRef} {...focusAttributes} className={mx('w-full overflow-hidden', classNames)} />;
};

export const ReadonlyTextBox = ({ classNames, value }: Pick<TextBoxProps, 'value' | 'classNames'>) => {
  const lines = value.split('\n');
  return (
    <div role='none' className={mx('w-full overflow-hidden', classNames)}>
      {lines.map((line, i) => (
        <div key={i} className='w-full text-center overflow-hidden'>
          {line}
        </div>
      ))}
    </div>
  );
};
