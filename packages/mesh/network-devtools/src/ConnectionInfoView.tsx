import { ConnectionInfo } from "@dxos/network-manager";
import React from 'react'

export interface ConnectionInfoViewProps {
  connectionInfo: ConnectionInfo
}

export const ConnectionInfoView = ({connectionInfo}: ConnectionInfoViewProps) => (
  <div>
    <div>state: {connectionInfo.state}</div>
    <div>sessionId: {connectionInfo.sessionId.toHex()}</div>
    <div>remotePeerId: {connectionInfo.remotePeerId.toHex()}</div>
    <div>transport: {connectionInfo.transport}</div>
    <div>protocolExtensions: {connectionInfo.protocolExtensions.join(',')}</div>
    <hr/>
    <div>
      {connectionInfo.events.map(event => (
        <div>
          {JSON.stringify(event)}
        </div>
      ))}
    </div>
  </div>
)
