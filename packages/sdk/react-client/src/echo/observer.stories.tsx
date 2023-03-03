//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React, { useMemo } from 'react';

import { PublicKey } from '@dxos/client';
import { Button } from '@dxos/react-components';

import { ClientSpaceDecorator } from '../testing';
import { observer } from './observer';
import { useSpace } from './useSpaces';

export default {
  title: 'echo/observer'
};

export const Default = {
  render: observer(({ spaceKey }: { spaceKey: PublicKey }) => {
    const space = useSpace(spaceKey);

    if (!space) {
      return null;
    }

    useMemo(() => {
      space.properties.count = 0;
    }, []);

    return (
      <div>
        <Button
          onClick={() => {
            space.properties.count--;
          }}
        >
          -
        </Button>
        <span>{space.properties.count}</span>
        <Button
          onClick={() => {
            space.properties.count++;
          }}
        >
          +
        </Button>
      </div>
    );
  }),
  decorators: [ClientSpaceDecorator()]
};

// TODO(wittjosiah): Make observer work with forwardRef.

// export const ForwardRef = {
//   render: observer(
//     forwardRef(({ spaceKey }: { spaceKey: PublicKey }, ref: ForwardedRef<HTMLDivElement>) => {
//       const space = useSpace(spaceKey);

//       if (!space) {
//         return null;
//       }

//       useMemo(() => {
//         space.properties.count = 0;
//       }, []);

//       return (
//         <div ref={ref}>
//           <Button
//             onClick={() => {
//               space.properties.count--;
//             }}
//           >
//             -
//           </Button>
//           <span>{space.properties.count}</span>
//           <Button
//             onClick={() => {
//               space.properties.count++;
//             }}
//           >
//             +
//           </Button>
//         </div>
//       );
//     })
//   ),
//   decorators: [ClientSpaceDecorator()]
// };
