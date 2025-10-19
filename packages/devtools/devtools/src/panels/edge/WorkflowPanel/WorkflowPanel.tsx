//
// Copyright 2020 DXOS.org
//

import * as SchemaAST from 'effect/SchemaAST';
import React, { useMemo, useState } from 'react';

import { ComputeGraph, ComputeGraphModel, WorkflowLoader } from '@dxos/conductor';
import { FormatEnum } from '@dxos/echo/internal';
import { Filter } from '@dxos/echo-db';
import { DXN } from '@dxos/keys';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';
import { type TablePropertyDefinition } from '@dxos/react-ui-table';
import { mx } from '@dxos/react-ui-theme';

import { ControlledSelector, MasterDetailTable, PanelContainer } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';

import { WorkflowDebugPanel, WorkflowDebugPanelMode } from './WorkflowDebugPanel';

export const WorkflowPanel = (props: { space?: Space }) => {
  const state = useDevtoolsState();
  const space = props.space ?? state.space;
  const [displayMode, setDisplayMode] = useState(DisplayMode.COMPILED);
  const [executionMode, setExecutionMode] = useState(WorkflowDebugPanelMode.LOCAL);
  const graphs = useQuery(space, Filter.type(ComputeGraph));
  const [selectedId, setSelectedId] = useState<string>();
  const selected = useMemo(() => graphs.find((graph) => graph.id === selectedId), [graphs, selectedId]);

  const loader = useMemo(() => createLoader(graphs), [graphs]);

  const properties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'id', format: FormatEnum.String },
      { name: 'nodes', format: FormatEnum.Number, size: 100 },
      { name: 'edges', format: FormatEnum.Number, size: 100 },
    ],
    [],
  );

  const tableData = useMemo(() => {
    return graphs.map((graph) => ({
      id: graph.id,
      nodes: graph.graph.nodes.length,
      edges: graph.graph.edges.length,
      _original: graph,
    }));
  }, [graphs]);

  const detailsTransform = useMemo(() => {
    return async (data: any) => {
      const graph = data._original;
      if (!graph) {
        return null;
      }

      try {
        if (displayMode === DisplayMode.COMPILED) {
          return await toWorkflow(loader, graph);
        } else if (displayMode === DisplayMode.GRAPH) {
          return toCompactGraph(graph);
        } else {
          // RAW mode - show the original graph
          return graph;
        }
      } catch (err: any) {
        return { error: err.message, stack: err.stack };
      }
    };
  }, [loader, displayMode]);

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          {!props.space && <DataSpaceSelector />}
          <ControlledSelector values={Object.values(DisplayMode)} value={displayMode} setValue={setDisplayMode} />
          <ControlledSelector
            values={Object.values(WorkflowDebugPanelMode)}
            value={executionMode}
            setValue={setExecutionMode}
          />
        </Toolbar.Root>
      }
    >
      <div className={'bs-full grid grid-rows-[4fr_3fr]'}>
        <MasterDetailTable
          properties={properties}
          data={tableData}
          detailsTransform={detailsTransform}
          onSelectionChanged={setSelectedId}
        />

        <div className={mx('bs-full')}>
          {selected && <WorkflowDebugPanel loader={loader} graph={selected} mode={executionMode} />}
        </div>
      </div>
    </PanelContainer>
  );
};

const toWorkflow = async (loader: WorkflowLoader, graph: ComputeGraph) => {
  try {
    const loaded = await loader.load(DXN.fromLocalObjectId(graph.id));
    const mapProps = (ast: SchemaAST.AST) =>
      Object.fromEntries(SchemaAST.getPropertySignatures(ast).map((prop) => [prop.name, prop.type]));
    const workflowMeta = loaded.resolveMeta();
    return {
      compiled: true,
      inputs: workflowMeta.inputs.map((input) => [input.nodeId, mapProps(input.schema.ast)]),
      outputs: workflowMeta.outputs.map((output) => [output.nodeId, mapProps(output.schema.ast)]),
    };
  } catch (err: any) {
    return { message: err.message, stack: err.stack };
  }
};

const toCompactGraph = (graph: ComputeGraph) => {
  const model = new ComputeGraphModel(graph);
  const result: any = {};
  for (const node of model.nodes) {
    const incoming = [];
    const outgoing = [];
    for (const edge of model.edges) {
      if (node.id === edge.source) {
        outgoing.push(`${edge.output} -> ${edge.target}.${edge.input}`);
      } else if (node.id === edge.target) {
        incoming.push(`${edge.source}.${edge.output} -> ${edge.input}`);
      }
    }
    result[node.id] = { in: incoming, out: outgoing };
  }
  return result;
};

const createLoader = (graphs: ComputeGraph[]) =>
  new WorkflowLoader({
    graphLoader: async (graphDxn) => {
      const graph = graphs.find((g) => DXN.equals(graphDxn, DXN.fromLocalObjectId(g.id)));
      if (!graph) {
        throw new Error(`Graph not found: ${graphDxn}.`);
      }
      return graph;
    },
    nodeResolver: async (node) => {
      throw new Error(`Unknown node type: ${node.type}.`);
    },
  });

enum DisplayMode {
  COMPILED = 'compiled',
  GRAPH = 'graph',
  RAW = 'raw',
}
