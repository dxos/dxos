import { plate } from '@dxos/plate';
import template from '../template.t';

export default template.define.script({
  content: ({ input: { react } }) => {
    return !react
      ? null
      : plate/* javascript */ `
    import React, { useEffect } from 'react';

    import { useQuery, useSpace } from '@dxos/react-client/echo';

    export const Counter = () => {
      const space = useSpace();
      const [counter] = useQuery(space, { type: 'counter' });

      if (!space) {
        return null;
      }

      return (
        <div>
          {counter && (
            <button
              className='p-4 m-2 border'
              data-testid='counter'
              onClick={() => {
                counter.count = counter.count + 1;
              }}>
              {counter.count ? \`Clicked \${counter.count} times\` : 'Click me!'}
            </button>
          )}
        </div>
      );
    };
    `;
  },
});
