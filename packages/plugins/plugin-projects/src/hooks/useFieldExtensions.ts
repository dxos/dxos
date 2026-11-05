//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { type Obj } from '@dxos/echo';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import { type FormExtensionsField } from '@dxos/react-ui-form';
import { isTruthy } from '@dxos/util';

/**
 * What other plugins give Markdown, for the editors of `subject`'s own strings, by the field each edits: the form's
 * `extensions` for a form whose collaborative fields edit `subject` (comments on a feature's name, say).
 */
export const useFieldExtensions = (
  subject: Obj.Unknown,
): ((field: Pick<FormExtensionsField, 'path'>) => Extension[]) => {
  const providers = Hooks.useCapabilities(MarkdownCapabilities.ExtensionProvider);
  return useCallback(
    ({ path }) =>
      providers
        .flat()
        .map((provider) => provider({ subject, binding: { object: subject, path: [...path] } }))
        .filter(isTruthy),
    [providers, subject],
  );
};
