//
// Copyright 2021 DXOS.org
//

import faker from 'faker';
import React, { useState } from 'react';
import crypto from 'crypto';
import pump from 'pump';

import { Button, Toolbar } from '@material-ui/core';

import { createKeyPair } from '@dxos/crypto';
import { ClientInitializer, useClient, useProfile } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-ux';
import {ERR_EXTENSION_RESPONSE_FAILED, ERR_EXTENSION_RESPONSE_TIMEOUT, Extension, Protocol} from '@dxos/protocol'
import { sleep } from '@dxos/async';
import { useEffect } from 'react';
import { createProtocols } from './protocols';

/**
 * Join two protocol streams together.
 */
export const ProtocolStreams = () => {
  const [protocols, setProtocols] = useState<ReturnType<typeof createProtocols> | undefined>(undefined)
  useEffect(() => {
    const protocols = createProtocols();
    setProtocols(protocols);

    pump(protocols.protocol1.stream, protocols.protocol2.stream, protocols.protocol1.stream)
  }, [])

  return (
    <div>Protocol streams.</div>
  );
};

export default {
  title: 'Protocols/protocol-streams',
  component: ProtocolStreams
};
