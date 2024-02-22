//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { SVG, SVGContextProvider, createSvgContext } from '@dxos/gem-core';
import {
  Graph,
  type GraphData,
  GraphForceProjector,
  type GraphLayoutNode,
  type GraphLink,
  GraphModel,
  emptyGraph,
  Markers,
  defaultStyles,
} from '@dxos/gem-spore';
import { type PeerState } from '@dxos/protocols/proto/dxos/mesh/presence';
import { type SpaceMember, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Toolbar } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { defaultMap } from '@dxos/util';

import { PanelContainer } from '../../../components';
import { SpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';

export type NetworkGraphNode = {
  id: string;
  peer?: PeerState;
  member?: SpaceMember;
};

class NetworkGraphModel extends GraphModel<NetworkGraphNode> {
  constructor(private _graph: GraphData<NetworkGraphNode> = emptyGraph) {
    super();
  }

  get graph() {
    return this._graph;
  }

  setData(graph: GraphData<NetworkGraphNode>) {
    this._graph = graph;
    this.triggerUpdate();
  }

  setFromMemberList(members: SpaceMember[]) {
    const nodes = new Map<string, NetworkGraphNode>();
    const links: GraphLink[] = [];

    for (const member of members) {
      for (const peer of member.peerStates ?? []) {
        if (!peer.peerId) {
          continue;
        }

        const node = defaultMap(nodes, peer.peerId.toHex(), { id: peer.peerId.toHex() });
        node.peer ??= peer;
        node.member ??= member;

        for (const other of peer.connections ?? []) {
          defaultMap(nodes, peer.peerId.toHex(), { id: peer.peerId.toHex() });
          defaultMap(nodes, other.toHex(), { id: other.toHex() });

          links.push({
            id: `${peer.peerId.toHex()}-${other.toHex()}`,
            source: peer.peerId.toHex(),
            target: other.toHex(),
          });
        }
      }
    }

    this.setData({ nodes: Array.from(nodes.values()), links });
  }
}

const classes = {
  default: '[&>circle]:fill-zinc-300 [&>circle]:stroke-zinc-400 [&>circle]:stroke-2',
  nodes: [
    '[&>circle]:fill-red-300',
    '[&>circle]:fill-green-300',
    '[&>circle]:fill-blue-300',
    '[&>circle]:fill-indigo-300',
    '[&>circle]:fill-teal-300',
    '[&>circle]:fill-cyan-300',
    '[&>circle]:fill-orange-300',
  ],
};

export const NetworkPanel = () => {
  const { space } = useDevtoolsState();
  const identity = useIdentity();

  const isMe = (node: NetworkGraphNode | undefined) =>
    identity ? node?.member?.identity.identityKey.equals(identity.identityKey) : false;

  const members = useMembers(space?.key);
  const [model] = useState(() => new NetworkGraphModel());
  useEffect(() => {
    if (members) {
      model.setFromMemberList(members);
    }
  }, [members]);

  const context = createSvgContext();
  const projector = useMemo(
    () =>
      new GraphForceProjector<NetworkGraphNode>(context, {
        forces: {
          manyBody: {
            strength: -160,
          },
          link: {
            distance: 120,
            iterations: 5,
          },
          radial: {
            radius: 60,
            strength: 0.2,
          },
        },
        attributes: {
          radius: (node: GraphLayoutNode<NetworkGraphNode>) => (isMe(node.data!) ? 24 : 16),
        },
      }),
    [],
  );

  // TODO(dmaretskyi): Highlight our direct connections.
  // TODO(dmaretskyi): Visualize data flowing: line thickness, running ticks, text stats.
  // TODO(dmaretskyi): Show connections that are forming.
  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <SpaceSelector includeHalo={true} />
        </Toolbar.Root>
      }
    >
      <SVGContextProvider context={context}>
        <SVG>
          <Markers />
          <Graph
            className={defaultStyles.links}
            model={model}
            drag
            arrows
            projector={projector}
            labels={{
              text: (node: GraphLayoutNode<NetworkGraphNode>, highlight) => {
                const identity =
                  node.data!.member?.identity.profile?.displayName ??
                  node.data!.member?.identity.identityKey.truncate();

                const peer = node.data!.peer?.peerId?.truncate();
                return `${peer} [${identity}]`;
              },
            }}
            attributes={{
              node: (node: GraphLayoutNode<NetworkGraphNode>) => {
                const key = node.data?.member?.identity.identityKey ?? node.data?.peer?.peerId;
                return {
                  class: mx(
                    'font-mono',
                    isMe(node.data) ? classes.default : classes.nodes[key?.getInsecureHash(classes.nodes.length) ?? 0],
                  ),
                };
              },
            }}
          />
        </SVG>
      </SVGContextProvider>
    </PanelContainer>
  );
};
