//
// Copyright 2021 DXOS.org
//

import React from 'react';

import ArrowBackIos from '@mui/icons-material/ArrowBackIos';
import InfoIcon from '@mui/icons-material/Info';
import {
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';

import { PublicKey } from '@dxos/keys';
import { ConnectionState } from '@dxos/network-manager';
import { SwarmInfo } from '@dxos/protocols/proto/dxos/devtools/swarmLog';
import { CopyText } from '@dxos/react-components';

export interface SwarmInfoViewProps {
  swarmInfo: SwarmInfo;
  onConnectionClick?: (sessionId: PublicKey) => void;
  onReturn?: () => void;
}

// TODO(burdon): Convert to table.
export const SwarmInfoView = ({
  swarmInfo,
  onConnectionClick,
  onReturn
}: SwarmInfoViewProps) => (
  <div>
    <div>
      Topic: <CopyText value={swarmInfo.topic.toHex()} />
    </div>
    <div>
      Label:{' '}
      {swarmInfo.label ? <CopyText value={swarmInfo.label} /> : 'No label'}
    </div>
    <div>Active: {swarmInfo.isActive ? 'yes' : 'no'}</div>
    <div>
      Active connection count:{' '}
      {
        swarmInfo.connections?.filter((c) => c.state !== ConnectionState.CLOSED)
          .length
      }
    </div>
    <div>Total connection count: {swarmInfo.connections?.length}</div>
    <hr />
    <div>Connections:</div>
    <List>
      {swarmInfo.connections?.map((connection) => (
        <ListItem key={connection.sessionId.toHex()}>
          <ListItemText>
            <CopyText value={connection.remotePeerId.toHex()} />
          </ListItemText>
          <ListItemIcon>
            <IconButton
              onClick={() => onConnectionClick?.(connection.sessionId)}
              title='Details'
            >
              <InfoIcon />
            </IconButton>
          </ListItemIcon>
        </ListItem>
      ))}
    </List>
    {onReturn && (
      <IconButton
        size='small'
        onClick={onReturn}
        title='Back'
        style={{ borderRadius: 5 }}
      >
        <ArrowBackIos />
        Back
      </IconButton>
    )}
  </div>
);
