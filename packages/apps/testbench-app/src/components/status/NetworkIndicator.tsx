//
// Copyright 2024 DXOS.org
//

import { type IconProps, Lightning, LightningSlash } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { useNetworkStatus } from '@dxos/react-client/mesh';
import { getSize, mx } from '@dxos/react-ui-theme';

import { styles } from './styles';

/**
 * Swarm connection handler.
 */
// TODO(burdon): Add network toggle.
export const NetworkIndicator = (props: IconProps) => {
  const [state, setState] = useState(0);
  const { swarm } = useNetworkStatus();
  useEffect(() => {
    setState(swarm === ConnectionState.ONLINE ? 0 : 1);
  }, [swarm]);

  if (state === 0) {
    return (
      <span title='Connected to swarm.'>
        <Lightning className={getSize(4)} {...props} />
      </span>
    );
  } else {
    return (
      <span title='Disconnected from swarm.'>
        <LightningSlash className={mx(styles.warning, getSize(4))} {...props} />
      </span>
    );
  }
};
