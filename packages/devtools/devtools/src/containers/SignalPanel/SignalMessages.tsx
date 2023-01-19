//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { SignalResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { useDevtools } from '@dxos/react-client';
import { humanize } from '@dxos/util';

import { ColumnType, MasterTable } from '../../components';

const types: ColumnType<SignalResponse>[] = [
  {
    id: 'swarm-event',
    title: 'SwarmEvent',
    filter: (response: SignalResponse) => {
      return !!response.swarmEvent;
    },
    columns: [
      {
        Header: 'Received At',
        accessor: (response: SignalResponse) => response.receivedAt.toJSON()
      },
      {
        Header: 'TYPE',
        accessor: (response: SignalResponse) => {
          if (response.swarmEvent?.peerAvailable) {
            return 'PeerAvailable';
          } else if (response.swarmEvent?.peerLeft) {
            return 'PeerLeft';
          }
        }
      },
      {
        Header: 'Peer',
        accessor: (response: SignalResponse) =>
          (response.swarmEvent!.peerAvailable && humanize(response.swarmEvent!.peerAvailable.peer)) ||
          (response.swarmEvent!.peerLeft && humanize(response.swarmEvent!.peerLeft.peer))
      },
      {
        Header: 'Since',
        accessor: (response: SignalResponse) => response.swarmEvent!.peerAvailable?.since?.toJSON()
      }
    ]
  },
  {
    id: 'message',
    title: 'Message',
    filter: (response: SignalResponse) => {
      return !!response.message;
    },
    columns: [
      {
        Header: 'Received At',
        accessor: (response: SignalResponse) => response.receivedAt.toJSON()
      },
      {
        Header: 'Author',
        accessor: (response: SignalResponse) => humanize(response.message!.author)
      },
      {
        Header: 'Recipient',
        accessor: (response: SignalResponse) => humanize(response.message!.recipient)
      },
      { Header: 'Payload', accessor: (response: SignalResponse) => JSON.stringify(response.message?.payload) },
      { Header: 'MessageID', accessor: (response: SignalResponse) => humanize(response.message?.payload.messageId) },
      {
        Header: 'Topic',
        accessor: (response: SignalResponse) =>
          response.message!.payload?.payload?.topic && humanize(response.message!.payload?.payload?.topic)
      }
    ]
  },
  {
    id: 'ack',
    title: 'Acknologment',
    filter: (response: SignalResponse) => {
      return response.message?.payload['@type'] === 'dxos.mesh.messaging.Acknowledgement';
    },
    columns: [
      {
        Header: 'Received At',
        accessor: (response: SignalResponse) => response.receivedAt.toJSON()
      },
      {
        Header: 'Author',
        accessor: (response: SignalResponse) => humanize(response.message!.author)
      },
      {
        Header: 'Recipient',
        accessor: (response: SignalResponse) => humanize(response.message!.recipient)
      },
      {
        Header: 'MessageID',
        accessor: (response: SignalResponse) => humanize(response.message!.payload.messageId)
      }
    ]
  }
];

export const SignalMessages = () => {
  const devtoolsHost = useDevtools();
  if (!devtoolsHost) {
    return null;
  }

  const [signalResponses, setSignalResponses] = useState<SignalResponse[]>([]);

  useEffect(() => {
    const signalOutput = devtoolsHost.subscribeToSignal();
    const signalResponses: SignalResponse[] = [];
    signalOutput.subscribe((response: SignalResponse) => {
      signalResponses.push(response);
      setSignalResponses([...signalResponses]);
    });

    return () => {
      signalOutput.close();
    };
  }, []);

  return <MasterTable types={types} data={signalResponses} />;
};
