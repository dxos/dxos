//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { useIdentity } from '@dxos/halo-react';
import { getSpace } from '@dxos/react-client/echo';
import { type FormExtensionsField } from '@dxos/react-ui-form';
import { createDataExtensions } from '@dxos/ui-editor';

/** A form's `extensions` that show the other peers' carets in each field of `subject`, one channel per field. */
export const usePresenceExtensions = (
  subject: Obj.Unknown | undefined,
): ((field: Pick<FormExtensionsField, 'path'>) => Extension[]) => {
  const identity = useIdentity();
  const space = subject && getSpace(subject);
  return useCallback(
    ({ path }) =>
      subject
        ? createDataExtensions({ id: `${Obj.getURI(subject)}.${path.join('.')}`, messenger: space, identity })
        : [],
    [subject, space, identity],
  );
};
