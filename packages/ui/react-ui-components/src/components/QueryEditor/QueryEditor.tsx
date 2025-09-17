//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/client-protocol';
import { useThemeContext } from '@dxos/react-ui';
import { createThemeExtensions, useTextEditor } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

// TODO(wittjosiah): Factor out.

export const QueryEditor = ({ space }: { space?: Space }) => {
  const { themeMode } = useThemeContext();
  const extensions = useMatcherExtension(space);

  const { parentRef } = useTextEditor(
    () => ({
      debug: true,
      autoFocus,
      extensions: [
        createThemeExtensions({ themeMode }),
        autocomplete({ onSubmit, onSuggest, onCancel }),
        references ? referencesExtension({ provider: references.provider }) : [],
        createBasicExtensions({
          bracketMatching: false,
          lineWrapping,
          placeholder,
        }),
        extensions,
      ].filter(isNonNullable),
    }),
    [themeMode, extensions, onSubmit, onSuggest, onCancel],
  );

  return <div ref={parentRef} className={mx('is-full', classNames)} />;
};
