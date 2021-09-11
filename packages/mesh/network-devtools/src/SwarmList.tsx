import { PublicKey } from "@dxos/crypto";
import { SwarmInfo } from "@dxos/network-manager";
import React from 'react'

export interface SwarmListProps {
  swarms: SwarmInfo[]
  onClick?: (id: PublicKey) => void
}

export const SwarmList = ({swarms, onClick}: SwarmListProps) => (
  <div>
    {swarms.map(swarm => (
      <div onClick={() => onClick?.(swarm.id)}>
        {swarm.label} {swarm.isActive ? 'JOINED' : 'LEFT'} {swarm.topic.toHex()}
      </div>
    ))}
  </div>
)
