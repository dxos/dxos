//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React, { useMemo } from 'react';

import { Button } from '@dxos/aurora';
import { PublicKey } from '@dxos/client';
import { observer } from '@dxos/observable-object/react';

import { ClientDecorator, setupPeersInSpace } from '../testing';
import { useSpace } from './useSpaces';

export default {
  title: 'echo/observer',
};

const Observed = observer(({ spaceKey }: { spaceKey: PublicKey }) => {
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
});

const { spaceKey, clients } = await setupPeersInSpace({ count: 2 });

export const Default = {
  render: (args: { id: number }) => <Observed {...args} spaceKey={spaceKey} />,
  decorators: [ClientDecorator({ clients })],
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
