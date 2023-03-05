//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { Column } from 'react-table';

import { PublicKey } from '@dxos/keys';
import { Button } from '@dxos/react-components';

import SyntaxHighlighter from 'react-syntax-highlighter';
// eslint-disable-next-line no-restricted-imports
import style from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-light';
import { FullScreen, Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
import { Graph as GemGraph, GraphModel, Markers } from '@dxos/gem-spore';
import { TestGraphModel } from '@dxos/gem-spore/testing';


const REFRESH_DELAY = 1000;

type BotRecord = {
  id: string;
  name: string;
  created: number;
  state: string;
  status: string;
};

const columns: Column<BotRecord>[] = [
  {
    Header: 'id',
    Cell: ({ value }: any) => <div className='font-mono'>{value}</div>,
    accessor: (record) => PublicKey.from(record.id).truncate(),
    width: 120
  },
  {
    Header: 'name',
    accessor: (record) => record.name,
    width: 120
  },
  {
    Header: 'created',
    accessor: (record) => new Date(record.created).toISOString(),
    width: 200
  },
  {
    Header: 'state',
    accessor: (record) => record.state,
    width: 120
  },
  {
    Header: 'status',
    accessor: (record) => record.status,
    width: 120
  }
];

export const NetworkFrame = () => {
  const [data, setData] = useState<any[]>([]);
  const [model] = useState(() => new TestGraphModel());

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:7630/api/logs')
    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'subscribe',
        filter: {
          message: 'dxos.mesh.connection.state'
          // context: {
          //   foo: 'bar'
          // }
        }
      }))
    }
    socket.onmessage = msg => {
      const event = JSON.parse(msg.data)
      if (event.message === 'dxos.mesh.connection.state') {
        console.log(event)
        if (!model.graph.nodes.find(node => node.id === event.context.peerId)) {
          model.graph.nodes.push({
            id: event.context.peerId,
            label: event.context.peerId.slice(0, 4),
          })
        }
        if (!model.graph.nodes.find(node => node.id === event.context.remoteId)) {
          model.graph.nodes.push({
            id: event.context.remoteId,
            label: event.context.remoteId.slice(0, 4),
          })
        }
        if (event.context.state === 'CONNECTED') {
          if (!model.graph.links.find(edge => edge.id === event.context.sessionId)) {
            model.graph.links.push({
              id: event.context.sessionId,
              source: event.context.peerId,
              target: event.context.remoteId,
            })
          }
        } else {
          model.graph.links = model.graph.links.filter(edge => edge.id !== event.context.sessionId)
        }
        model.triggerUpdate();
      }

      setData(data => [...data, JSON.parse(msg.data)])
    }
  }, []);


  return (
    <div className='flex-1 flex-col px-2'>
      <div className='flex items-center p-2 mb-2'>
        <Button className='mr-2'>
          Button 1
        </Button>
        <Button className='mr-2'>
          Button 2
        </Button>
        <div></div>
      </div>

      {/* <SyntaxHighlighter className='w-full' language='json' style={style}>
        {JSON.stringify(data, undefined, 2)}
      </SyntaxHighlighter> */}

      <FullScreen>
        <SVGContextProvider>
          <SVG>
            <Markers />
            <Grid />
            <Zoom extent={[1, 4]}>
              <GemGraph model={model} drag labels={{ text: node => node.data.label }} />
            </Zoom>
          </SVG>
        </SVGContextProvider>
      </FullScreen>
    </div>
  );
};
