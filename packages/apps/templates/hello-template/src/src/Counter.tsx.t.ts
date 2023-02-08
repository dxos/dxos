import { defineTemplate, text } from '@dxos/plate';
import config from '../config.t';

export default defineTemplate(
  ({ input: { react } }) => {
    return !react
      ? null
      : text/* javascript */ `
    import React, { useEffect } from 'react';

    import { Loading } from '@dxos/react-components';
    import { useQuery, Document, useIdentity, useSpace } from '@dxos/react-client';

    export const Counter = () => {
      const identity = useIdentity({ login: true });
      const space = useSpace(null, { create: true });
      const [counter] = useQuery(space, { type: 'counter' });
      useEffect(() => {
        if (!counter && space) {
          const c = new Document({ type: 'counter' });
          void space.experimental.db.save(c);
        }
      }, [counter, space]);
      if (!space) {
        return <Loading label='Loading' />;
      }
      return (
        <div>
          {identity && \`Hello \${identity?.displayName}!\`}
          {counter && (
            <button
              className='p-4 m-2 border'
              onClick={() => {
                counter.count = (counter.count ?? 0) + 1;
              }}>
              {counter.count ? \`Clicked \${counter.count} times\` : \`Hey \${identity?.displayName ?? ''}, click me!\`}
            </button>
          )}
        </div>
      );
    };
    `;
  },
  { config }
);
