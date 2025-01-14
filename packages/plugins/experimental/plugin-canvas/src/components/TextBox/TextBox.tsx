//
// Copyright 2024 DXOS.org
//

import { Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import React, { forwardRef, useEffect, useImperativeHandle } from 'react';

import { useThemeContext, type ThemedClassName } from '@dxos/react-ui';
import {
  type BasicExtensionsOptions,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

export interface TextBoxControl {
  focus(): void;
}

export type TextBoxProps = ThemedClassName<
  {
    value?: string;
    reset?: object;
    centered?: boolean;
    onEnter?: (value: string) => void;
    onCancel?: () => void;
  } & Pick<BasicExtensionsOptions, 'placeholder'>
>;

export const TextBox = forwardRef<TextBoxControl, TextBoxProps>(
  ({ classNames, value = '', reset, centered, onEnter, onCancel, ...rest }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const { parentRef, view, focusAttributes } = useTextEditor(() => {
      return {
        id: 'text',
        initialValue: value,
        extensions: [
          createBasicExtensions({ lineWrapping: !centered, ...rest }),
          createMarkdownExtensions(),
          decorateMarkdown(),
          createThemeExtensions({
            themeMode,
            slots: {
              editor: { className: 'w-full [&>.cm-scroller]:scrollbar-none' },
              content: { className: mx(centered && 'text-center') },
            },
          }),
          EditorView.focusChangeEffect.of((state, focusing) => {
            if (!focusing) {
              onEnter?.(state.doc.toString());
            }
            return null;
          }),
          Prec.highest(
            keymap.of([
              {
                key: 'Enter',
                preventDefault: true,
                run: (view) => {
                  onEnter?.(view.state.doc.toString());
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

    // External control.
    useImperativeHandle(
      forwardedRef,
      () => ({
        focus: () => view?.focus(),
      }),
      [view],
    );

    // TODO(burdon): Better way to reset?
    useEffect(() => {
      if (reset) {
        view?.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
      }
    }, [view, value, reset]);

    useEffect(() => {
      view?.dispatch({ selection: { anchor: view.state.doc.length } });
      view?.focus();
    }, [view]);

    return <div ref={parentRef} {...focusAttributes} className={mx('w-full overflow-hidden', classNames)} />;
  },
);

export const ReadonlyTextBox = ({ classNames, value = '' }: Pick<TextBoxProps, 'value' | 'classNames'>) => {
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
