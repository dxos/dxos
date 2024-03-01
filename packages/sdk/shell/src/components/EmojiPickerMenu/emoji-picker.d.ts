//
// Copyright 2024 DXOS.org
//

import type Picker from 'emoji-picker-element/picker';
import type * as React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'emoji-picker': EmojiPickerProps;
    }
  }
}

interface EmojiPickerProps extends React.DetailedHTMLProps<React.HTMLAttributes<Picker>, Picker> {}
