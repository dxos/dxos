//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { useCallback, useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { useIdentity } from '@dxos/halo-react';
import { getSpace } from '@dxos/react-client/echo';
import { type FormExtensionsField } from '@dxos/react-ui-form';
import { type DataExtensionsIdentity, createDataExtensions } from '@dxos/ui-editor';

/**
 * The local identity as the carets label it, compared by value: `useIdentity` gives its snapshot and then the same
 * identity again from its stream, and a new object would rebuild every editor it is passed to.
 */
export const useCaretIdentity = (): DataExtensionsIdentity | undefined => {
  const { identityKey, displayName, data } = useIdentity() ?? {};
  const hue = data?.hue;
  return useMemo(
    () => (identityKey ? { identityKey, displayName, data: { hue } } : undefined),
    [identityKey, displayName, hue],
  );
};

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
  const identity = useCaretIdentity();
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
