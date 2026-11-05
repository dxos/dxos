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

/** A form's `extensions` for the collaborative fields of `subject`: what plugins give Markdown, bound to each field. */
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
