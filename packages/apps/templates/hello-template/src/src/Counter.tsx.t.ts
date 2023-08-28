import { plate } from '@dxos/plate';
import template from '../template.t';

export default template.define.script({
  content: ({ input: { react } }) => {
    return !react
      ? null
      : plate/* javascript */ `
    import React, { useEffect } from 'react';

    import { Loading } from '@dxos/react-appkit';
    import { useQuery, Expando, useSpaces } from '@dxos/react-client/echo';
    import { useIdentity } from '@dxos/react-client/halo';

    export const Counter = () => {
      const identity = useIdentity();
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
  }}
);
