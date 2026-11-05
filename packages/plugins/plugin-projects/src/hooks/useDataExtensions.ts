//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { useIdentity } from '@dxos/halo-react';
import { getSpace } from '@dxos/react-client/echo';
import { type FormExtensionsField } from '@dxos/react-ui-form';
import { createDataExtensions } from '@dxos/ui-editor';

export type UseDataExtensionsOptions = {
  /** Binds each editor to its field's string; `false` where the editor binds itself, as a `Ref<Text>` field's does. */
  text?: boolean;
};

/**
 * A form's `extensions` that bind each field's editor to its string in `subject` and show the other peers' carets in
 * it, one awareness channel per field.
 */
export const useDataExtensions = (
  subject: Obj.Unknown | undefined,
  { text = true }: UseDataExtensionsOptions = {},
): ((field: Pick<FormExtensionsField, 'path'>) => Extension[]) => {
  const identity = useIdentity();
  const space = subject && getSpace(subject);
  return useCallback(
    ({ path }) =>
      subject
        ? createDataExtensions({
            id: `${Obj.getURI(subject)}.${path.join('.')}`,
            text: text ? Doc.createAccessor(subject, [...path]) : undefined,
            messenger: space,
            identity,
          })
        : [],
    [subject, text, space, identity],
  );
};
