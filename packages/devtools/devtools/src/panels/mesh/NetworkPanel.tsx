import { Toolbar } from "@dxos/aurora";
import { mx } from "@dxos/aurora-theme";
import { SVG, SVGContextProvider, createSvgContext } from '@dxos/gem-core';
import { Graph, GraphData, GraphForceProjector, GraphLayoutNode, GraphLink, GraphModel, emptyGraph } from "@dxos/gem-spore";
import { PeerState } from "@dxos/protocols/proto/dxos/mesh/presence";
import { SpaceMember, useMembers } from "@dxos/react-client/echo";
import { useIdentity } from "@dxos/react-client/halo";
import { defaultMap } from "@dxos/util";
import React, { useEffect, useMemo, useState } from 'react';
import { PanelContainer } from "../../components";
import { SpaceSelector } from "../../containers";
import { useDevtoolsState } from "../../hooks";

const NetworkPanel = () => {
  const { space } = useDevtoolsState();
  const identity = useIdentity();

  const isMe = (node: NetworkGraphNode) => identity ? node.member?.identity.identityKey.equals(identity.identityKey) : false;

  const members = useMembers(space?.key);
  const [model] = useState(() => new NetworkGraphModel());
  useEffect(() => {
    if (members) {
      model.setFromMemberList(members);
      console.log(model.graph)
    }
  }, [members])

  const context = createSvgContext();
  const projector = useMemo(
    () =>
      new GraphForceProjector<NetworkGraphNode>(context, {
        guides: true,
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
          radius: (node: GraphLayoutNode<NetworkGraphNode>, count) => isMe(node.data!) ? 10 : 6,
        },
      }),
    [],
  );

  // TODO(dmaretskyi): Fix colors.
  // TODO(dmaretskyi): Highlight our direct connections.
  // TODO(dmaretskyi): Visualize data flowing: line thickness, running ticks, text stats.
  // TODO(dmaretskyi): Show connections that are forming.
  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <SpaceSelector />
        </Toolbar.Root>
      }
      className='overflow-auto'
    >
      <SVGContextProvider context={context}>
        <SVG>
          {/* <Markers /> */}
          {/* <Grid /> */}
          {/* <Zoom extent={[1 / 2, 2]}> */}
          <Graph
            model={model}
            drag
            arrows
            projector={projector}
            labels={{
              text: (node: GraphLayoutNode<NetworkGraphNode>, highlight) => {
                // TODO(dmaretskyi): CSS margins?
                const margin = '       '
                return margin + (node.data!.member?.identity.profile?.displayName ?? node.data!.member?.identity.identityKey.truncate() ?? node.data!.peer?.peerId?.truncate() ?? node.data!.id) + margin;
              }
            }}
            attributes={{
              node: (node: GraphLayoutNode<NetworkGraphNode>) => {
                const key = node.data?.member?.identity.identityKey ?? node.data?.peer?.peerId;
                const color = NODE_COLORS[key?.getInsecureHash(NODE_COLORS.length) ?? 0];

                return {
                  class: mx(color, isMe(node.data!) && 'border-2')
                }
              },
            }}
          />
          {/* </Zoom> */}
        </SVG>
      </SVGContextProvider>
    </PanelContainer>
  );
}

const NODE_COLORS = [
  'fill-red-500',
  'fill-yellow-500',
  'fill-green-500',
  'fill-blue-500',
  'fill-indigo-500',
  'fill-purple-500',
  'fill-pink-500',
]

export default NetworkPanel;

export type NetworkGraphNode = {
  id: string;
  peer?: PeerState;
  member?: SpaceMember;
}

class NetworkGraphModel extends GraphModel<NetworkGraphNode> {
  // prettier-ignore
  constructor(
    private _graph: GraphData<NetworkGraphNode> = emptyGraph
  ) {
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
    const links: GraphLink[] = []

    for (const member of members) {
      for (const peer of member.peerStates ?? []) {
        if (!peer.peerId) continue;

        const node = defaultMap(nodes, peer.peerId.toHex(), { id: peer.peerId.toHex() });
        node.peer ??= peer;
        node.member ??= member;

        for (const other of peer.connections ?? []) {
          defaultMap(nodes, peer.peerId.toHex(), { id: peer.peerId.toHex() })
          defaultMap(nodes, other.toHex(), { id: other.toHex() })

          links.push({
            id: `${peer.peerId.toHex()}-${other.toHex()}`,
            source: peer.peerId.toHex(),
            target: other.toHex(),
          })
        }
      }
    }

    this.setData({ nodes: Array.from(nodes.values()), links });
  }
}