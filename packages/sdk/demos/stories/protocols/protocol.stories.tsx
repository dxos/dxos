//
// Copyright 2021 DXOS.org
//

import pump from 'pump';
import React, { useEffect, useState } from 'react';

import { createProtocols } from './protocols';

/**
 * Join two protocol streams together.
 */
export const ProtocolStreams = () => {
  const [, setProtocols] = useState<ReturnType<typeof createProtocols> | undefined>(undefined);
  useEffect(() => {
    const protocols = createProtocols();
    setProtocols(protocols);

    pump(protocols.protocol1.stream, protocols.protocol2.stream, protocols.protocol1.stream);
  }, []);

  return (
    <div>Protocol streams.</div>
  );
};

export default {
  title: 'Protocols/protocol-streams',
  component: ProtocolStreams
};
