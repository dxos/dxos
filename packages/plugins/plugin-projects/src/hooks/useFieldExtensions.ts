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

import { useDataExtensions } from './useDataExtensions.ts';

/**
 * A form's `extensions` for the collaborative fields of `subject`: the binding to each field's string with the other
 * peers' carets in it, and what plugins give Markdown, bound to the field.
 */
export const useFieldExtensions = (
  subject: Obj.Unknown,
): ((field: Pick<FormExtensionsField, 'path'>) => Extension[]) => {
  const providers = Hooks.useCapabilities(MarkdownCapabilities.ExtensionProvider);
  const data = useDataExtensions(subject);
  return useCallback(
    (field) => [
      ...data(field),
      ...providers
        .flat()
        .map((provider) => provider({ subject, binding: { object: subject, path: [...field.path] } }))
        .filter(isTruthy),
    ],
    [providers, subject, data],
  );
};
