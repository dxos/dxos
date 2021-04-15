//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import React, { useEffect, useState } from 'react';
import useResizeAware from 'react-resize-aware';
import { withKnobs, number } from '@storybook/addon-knobs';
import { makeStyles } from '@material-ui/core/styles';
import { blueGrey } from '@material-ui/core/colors';

import { FullScreen, SVG, useGrid } from '@dxos/gem-core';
import { Markers } from '@dxos/gem-spore';
import { createId } from '@dxos/crypto';

import { createECHO, EchoContext, EchoGraph, useDatabase } from '../src';

const log = debug('dxos:echo:demo');
debug.enable('dxos:echo:demo, dxos:*:error');

export default {
  title: 'Demo',
  decorators: [withKnobs]
};

const useStyles = makeStyles(() => ({
  info: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    '& > div': {
      maxWidth: 300,
      overflow: 'hidden',
      padding: 8,
      margin: 8,
      wordBreak: 'break-all',
      fontFamily: 'sans-serif',
      fontWeight: 100,
      backgroundColor: blueGrey[50],
      border: `1px solid ${blueGrey[200]}`,
      borderRadius: 4
    }
  }
}));

export const withDatabase = () => {
  const n = number('Datatbases', 1, { min: 1, max: 8 });

  const [peers, setPeers] = useState([]);
  useEffect(() => {
    if (n > peers.length) {
      setImmediate(async () => {
        const newPeers = await Promise.all([...new Array(n - peers.length)].map(async (_, i) => {
          const id = createId();
          const { echo } = await createECHO({ initialize: true });
          console.log('Created:', String(echo));
          return { id, database: echo };
        }));

        setPeers([...peers, ...newPeers]);
      });
    } else if (n < peers.length) {
      const diff = peers.length - n;
      peers.splice(peers.length - diff, diff);
      setPeers([...peers]);
    }
  }, [n]);

  return (
    <Test peers={peers} />
  );
};

const Info = () => {
  // TODO(burdon): Subscribe to events.
  const database = useDatabase();
  const [info, setInfo] = useState(String(database));
  useEffect(() => {
    let unsubscribe;
    setImmediate(async () => {
      const result = await database.queryParties();
      unsubscribe = result.subscribe(() => {
        setInfo(String(database));
      });
    });

    return () => {
      unsubscribe && unsubscribe();
    };
  }, [database]);

  return (
    <div>{info}</div>
  );
};

const Test = ({ peers }) => {
  const classes = useStyles();
  const [resizeListener, size] = useResizeAware();
  const { width, height } = size;
  const grid = useGrid({ width, height });

  // Click to invite.
  const handleInvite = async (peer, node) => {
    const party = await peer.database.getParty(node.partyKey);
    await Promise.all(peers.map(async p => {
      if (p.id !== peer.id) {
        log(`Inviting ${peer.id} => ${p.id} [${String(party)}]`);

        // Invite party.
        const invitation = await party.createInvitation({
          secretProvider: () => Buffer.from('0000'),
          secretValidator: () => true,
        });
        log('Invitation request:', invitation);

        const remoteParty = await p.database.joinParty(invitation, () => Buffer.from('0000'));
        await remoteParty.open();
        log('Invited Party:', String(remoteParty));

        // TODO(burdon): Bugs after creating multiple parties.
        // events.js:46 MaxListenersExceededWarning: Possible EventEmitter memory leak detected.
        // 11 feed listeners added. Use emitter.setMaxListeners() to increase limit
        //     at _addListener (http://localhost:9001/vendors~main.3e634c573a17f55911d9.bundle.js:265267:15)
        //     at FeedStore.addListener (http://localhost:9001/vendors~main.3e634c573a17f55911d9.bundle.js:265283:10)
        //     at PartyManager.open (http://localhost:9001/main.3e634c573a17f55911d9.bundle.js:5135:25)
        //     at async Database.open (http://localhost:9001/main.3e634c573a17f55911d9.bundle.js:4448:9)
        //     at async Database.createParty (http://localhost:9001/main.3e634c573a17f55911d9.bundle.js:4463:9)
        //     at async http://localhost:9001/main.3e634c573a17f55911d9.bundle.js:11284:25
      }
    }));
  };

  const radius = Math.min(grid.size.width, grid.size.height) / 3;
  const scale = {
    x: Math.min(grid.size.width, grid.size.height) / 3,
    y: Math.min(grid.size.width, grid.size.height) / 3
  };
  const da = -(Math.PI * 2) / (peers.length);

  return (
    <FullScreen>
      {resizeListener}

      <SVG width={width} height={height}>
        <Markers />

        {peers.map((peer, i) => {
          const { id, database } = peer;
          const delta = (peers.length === 1) ? { x: 0, y: 0 } : {
            x: Math.sin(i * da + da / 2) * scale.x,
            y: Math.cos(i * da + da / 2) * scale.y
          };

          // TODO(burdon): Does context change?
          return (
            <EchoContext.Provider key={id} value={{ database }}>
              <EchoGraph
                id={id}
                grid={grid}
                delta={delta}
                radius={radius}
                onSelect={node => node.type === 'party' && handleInvite(peer, node)}
              />
            </EchoContext.Provider>
          );
        })}
      </SVG>

      <div className={classes.info}>
        {peers.map((peer, i) => {
          const { id, database } = peer;
          return (
            <EchoContext.Provider key={id} value={{ database }}>
              <Info />
            </EchoContext.Provider>
          );
        })}
      </div>
    </FullScreen>
  );
};
