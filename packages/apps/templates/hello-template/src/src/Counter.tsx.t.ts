import { defineTemplate, text } from '@dxos/plate';
import config from '../config.t';

export default defineTemplate(
  ({ input: { react } }) => {
    return !react
      ? null
      : text/* javascript */ `
    import React, { useEffect } from 'react';

    import { Loading } from '@dxos/react-appkit';
    import { useQuery, Expando, useIdentity, useSpaces } from '@dxos/react-client';

    export const Counter = () => {
      const identity = useIdentity({ login: true });
      const [space] = useSpaces();
      const [counter] = useQuery(space, { type: 'counter' });

      useEffect(() => {
        if (!counter && space) {
          const c = new Expando({ type: 'counter' });
          void space.db.add(c);
        }
      }, [counter, space]);

      if (!space) {
        return <Loading label='Loading' />;
      }

      return (
        <div>
          {identity && \`Hello \${identity?.profile?.displayName}!\`}
          {counter && (
            <button
              className='p-4 m-2 border'
              onClick={() => {
                counter.count = (counter.count ?? 0) + 1;
              }}>
              {counter.count ? \`Clicked \${counter.count} times\` : 'Click me!'}
            </button>
          )}
        </div>
      );
    };
    `;
  },
  { config }
);
