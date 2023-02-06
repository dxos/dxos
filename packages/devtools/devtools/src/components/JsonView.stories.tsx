//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import * as pb from 'protobufjs';
import React from 'react';

import { PublicKey } from '@dxos/keys';
import { schemaJson } from '@dxos/protocols';
import { Message } from '@dxos/protocols/proto/dxos/mesh/signal';
import { SwarmMessage } from '@dxos/protocols/proto/dxos/mesh/swarm';

import { JsonView } from './JsonView';

export default {
  component: JsonView,
  argTypes: {}
};

const swarmMessage: SwarmMessage = {
  topic: PublicKey.random(),
  sessionId: PublicKey.random(),
  data: { signal: { payload: { type: 'test', data: 'test' } } },
  messageId: PublicKey.random()
};

const data: Message = {
  author: PublicKey.random().asUint8Array(),
  recipient: PublicKey.random().asUint8Array(),
  payload: swarmMessage
};

const pbType = pb.Root.fromJSON(schemaJson).lookupType('dxos.mesh.signal.Message');
console.log(pbType);

export const Default = {
  render: () => {
    // TODO(burdon): Make responsive.
    return <JsonView data={data} type={pbType} />;
  }
};
