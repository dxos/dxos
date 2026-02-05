//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { useNetworkStatus } from '@dxos/react-client/mesh';
import { Icon } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { styles } from './styles';

/**
 * Swarm connection handler.
 */
// TODO(burdon): Add network toggle.
export const NetworkIndicator = () => {
  const [state, setState] = useState(0);
  const { swarm } = useNetworkStatus();
  useEffect(() => {
    setState(swarm === ConnectionState.ONLINE ? 0 : 1);
  }, [swarm]);

  if (state === 0) {
    return (
      <span title='Connected to swarm.'>
        <Icon icon='ph--lightning--regular' size={4} />
      </span>
    );
  } else {
    return (
      <span title='Disconnected from swarm.'>
        <Icon icon='ph--lightning-slash--regular' size={4} classNames={mx(styles.warning)} />
      </span>
    );
  }
};
