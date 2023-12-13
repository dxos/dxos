//
// Copyright 2023 DXOS.org
//

import { StateField } from '@codemirror/state';

/**
 * Based on https://github.com/codemirror/dev/issues/44#issuecomment-789093799
 * @param onChange
 */
export const onChangeExtension = (onChange: (text: string) => void) =>
  StateField.define({
    create: () => null,
    update: (_value, transaction) => {
      if (transaction.docChanged && onChange) {
        onChange(transaction.newDoc.toString());
      }

      return null;
    },
  });
