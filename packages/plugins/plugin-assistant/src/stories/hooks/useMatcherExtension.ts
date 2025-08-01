//
// Copyright 2025 DXOS.org
//

// TODO(burdon): Move def to @dxos/echo.
import { useMemo } from 'react';

import { type Space } from '@dxos/client/echo';
import { Type } from '@dxos/echo';
import { matchCompletion, staticCompletion, type TypeaheadContext, typeahead } from '@dxos/react-ui-editor';

export const useMatcherExtension = (space: Space) => {
  return useMemo(() => {
    const handleComplete = ({ line }: TypeaheadContext) => {
      const words = line.split(/\s+/).filter(Boolean);
      if (words.length > 0) {
        const word = words.at(-1)!;

        // Match type.
        const match = word.match(/^type:(.+)/);
        if (match) {
          const part = match[1];
          for (const schema of space?.db.graph.schemaRegistry.schemas ?? []) {
            const typename = Type.getTypename(schema);
            if (typename) {
              const completion = matchCompletion(typename, part);
              if (completion) {
                return completion;
              }
            }
          }
        }

        // Match static.
        return staticCompletion(['type:', 'AND', 'OR', 'NOT'])({ line });
      }
    };

    return [
      typeahead({
        onComplete: handleComplete,
      }),
    ];
  }, [space]);
};
