//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useThemeContext, type ThemedClassName } from '@dxos/react-ui';
import { createBasicExtensions, createThemeExtensions, useTextEditor } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

export type TextBoxProps = ThemedClassName<{
  value: string;
  onClose?: (value: string) => void;
  onCancel?: () => void;
}>;

export const TextBox = ({ classNames, value, onClose, onCancel }: TextBoxProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef, view, focusAttributes } = useTextEditor(() => {
    return {
      id: 'text',
      initialValue: value,
      extensions: [
        createBasicExtensions(),
        createThemeExtensions({ themeMode, slots: { editor: { className: 'p-2' } } }),
      ],
    };
  }, [value]);

  // const textBoxRef = useRef<HTMLDivElement>(null);
  // const [text, setText] = useState('');
  // useEffect(() => {
  //   setText(value ?? 'xxx');
  // }, [value]);

  // const handleKeyDown = useCallback<KeyboardEventHandler<HTMLDivElement>>((ev) => {
  //   switch (ev.key) {
  //     case 'Enter': {
  //       if (!ev.shiftKey) {
  //         onClose?.(text);
  //       }
  //       break;
  //     }
  //     case 'Escape': {
  //       onCancel?.();
  //       break;
  //     }
  //   }
  // }, []);

  // const handleBlur = useCallback<FocusEventHandler<HTMLDivElement>>(
  //   (ev) => {
  //     // onClose?.(text);
  //   },
  //   [text],
  // );

  // TODO(burdon): Use codemirror?
  return <div ref={parentRef} {...focusAttributes} className={mx(classNames)} />;
};
