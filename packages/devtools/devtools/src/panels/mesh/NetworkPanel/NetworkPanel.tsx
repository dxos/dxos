//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { type Graph, GraphModel } from '@dxos/graph';
import { type PeerState } from '@dxos/protocols/proto/dxos/mesh/presence';
import { type Space, type SpaceMember, useMembers } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Toolbar } from '@dxos/react-ui';
import { GraphForceProjector, type GraphLayoutNode, SVG, type SVGContext } from '@dxos/react-ui-graph';

import { PanelContainer } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';

export type NetworkGraphNode = {
  id: string;
  peer?: PeerState;
  member?: SpaceMember;
};

// TODO(burdon): Update to use new GraphModel.
class NetworkGraphModel extends GraphModel.GraphModel {
  setData(graph: Graph.Any): void {
    // this._graph = graph;
  }

  setFromMemberList(members: SpaceMember[]): void {
    // const nodes = new Map<string, NetworkGraphNode>();
    // const edges: GraphEdge[] = [];
    // for (const member of members) {
    //   for (const peer of member.peerStates ?? []) {
    //     if (!peer.peerId) {
    //       continue;
    //     }
    //     const node = defaultMap(nodes, peer.peerId.toHex(), { id: peer.peerId.toHex() });
    //     node.peer ??= peer;
    //     node.member ??= member;
    //     for (const other of peer.connections ?? []) {
    //       defaultMap(nodes, peer.peerId.toHex(), { id: peer.peerId.toHex() });
    //       defaultMap(nodes, other.toHex(), { id: other.toHex() });
    //       edges.push({
    //         id: `${peer.peerId.toHex()}-${other.toHex()}`,
    //         source: peer.peerId.toHex(),
    //         target: other.toHex(),
    //       });
    //     }
    //   }
    // }
    // this.setData({ nodes: Array.from(nodes.values()), edges });
  }
}

const _classes = {
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

export const NetworkPanel = (props: { space?: Space }) => {
  const state = useDevtoolsState();
  const space = props.space ?? state.space;
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

  const context = useRef<SVGContext>(null);
  const projector = useMemo<GraphForceProjector | undefined>(
    () =>
      context.current
        ? new GraphForceProjector(context.current, {
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
          })
        : undefined,
    [context],
  );

  // TODO(dmaretskyi): Highlight our direct connections.
  // TODO(dmaretskyi): Visualize data flowing: line thickness, running ticks, text stats.
  // TODO(dmaretskyi): Show connections that are forming.
  return (
    <PanelContainer
      toolbar={
        props.space ? undefined : (
          <Toolbar.Root>
            <DataSpaceSelector />
          </Toolbar.Root>
        )
      }
    >
      <SVG.Root ref={context}>
        <SVG.Markers />
        <SVG.Graph
          model={model}
          drag
          arrows
          projector={projector}
          labels={{
            text: (node: GraphLayoutNode<NetworkGraphNode>, highlight) => {
              const identity =
                node.data!.member?.identity.profile?.displayName ?? node.data!.member?.identity.identityKey.truncate();

              const peer = node.data!.peer?.peerId?.truncate();
              return `${peer} [${identity}]`;
            },
          }}
          // TODO(burdon): Fix classes.
          // attributes={{
          //   node: (node: GraphLayoutNode<NetworkGraphNode>) => {
          //     const key = node.data?.member?.identity.identityKey ?? node.data?.peer?.peerId;
          //     return {
          //       class: mx(
          //         'font-mono',
          //         isMe(node.data) ? classes.default : classes.nodes[key?.getInsecureHash(classes.nodes.length) ?? 0],
          //       ),
          //     };
          //   },
          // }}
        />
      </SVG.Root>
    </PanelContainer>
  );
};
