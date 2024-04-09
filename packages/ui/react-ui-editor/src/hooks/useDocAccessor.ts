//
// Copyright 2024 DXOS.org
//

import { useMemo } from 'react';

import { createDocAccessor, type DocAccessor, getTextContent, type EchoReactiveObject } from '@dxos/echo-schema';

// TODO(burdon): Factor out.
export const useDocAccessor = <T = any>(
  text: EchoReactiveObject<{ content: string }>,
): { id: string; doc: string | undefined; accessor: DocAccessor<T> } => {
  return useMemo(
    () => ({
      id: text.id,
      doc: getTextContent(text),
      accessor: createDocAccessor<T>(text),
    }),
    [text],
  );
};
