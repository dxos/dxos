//
// Copyright 2024 DXOS.org
//

import { Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

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
    const [modified, setModified] = useState(false);
    const doc = useRef(value);
    useEffect(() => {
      setModified(false);
      doc.current = value;
    }, [value]);

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
              editor: { className: 'w-full h-full [&>.cm-scroller]:scrollbar-none p-2' },
              content: { className: mx(centered && 'text-center') },
            },
          }),
          // Detect changes.
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              setModified(doc.current !== update.state.doc.toString());
            }
          }),
          // TODO(burdon): Only fire if modified.
          EditorView.focusChangeEffect.of((state, focusing) => {
            if (!focusing && modified) {
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
                  setModified(false);
                  return true;
                },
              },
              {
                key: 'Shift-Enter',
                run: (view) => {
                  view.dispatch(view.state.replaceSelection('\n'));
                  setModified(false);
                  return true;
                },
              },
              {
                key: 'Escape',
                run: () => {
                  onCancel?.();
                  setModified(false);
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
        focus: () => {
          view?.focus();
        },
      }),
      [view],
    );

    // TODO(burdon): Better way to reset?
    useEffect(() => {
      if (reset) {
        view?.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
      }
    }, [view, value, reset]);

    // Scroll to bottom.
    useEffect(() => {
      view?.dispatch({ selection: { anchor: view.state.doc.length } });
    }, [view]);

    return (
      <div
        ref={parentRef}
        {...focusAttributes}
        // style={
        //   {
        //     '--dx-cmCursor': 'red',
        //   } as CSSProperties
        // }
        className={mx('h-full w-full overflow-hidden', classNames)}
      />
    );
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
