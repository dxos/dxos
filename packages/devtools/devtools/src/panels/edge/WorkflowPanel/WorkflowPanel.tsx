//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { ComputeGraph, ComputeGraphModel, WorkflowLoader } from '@dxos/conductor';
import { Filter } from '@dxos/echo-db';
import { AST } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { useQuery } from '@dxos/react-client/echo';
import { Select, Toolbar } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { createColumnBuilder, Table, type TableColumnDef } from '@dxos/react-ui-table/deprecated';
import { mx } from '@dxos/react-ui-theme';

import { WorkflowDebugPanel, WorkflowDebugPanelMode } from './WorkflowDebugPanel';
import { PanelContainer } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';
import { styles } from '../../../styles';

const { helper, builder } = createColumnBuilder<ComputeGraph>();
const columns: TableColumnDef<ComputeGraph, any>[] = [
  helper.accessor(
    'id',
    builder.string({
      header: 'id',
      size: 140,
      meta: { cell: { classNames: ['font-mono'] } },
    }),
  ),
  helper.accessor((item) => item.graph.nodes.length, {
    id: 'nodes',
    ...builder.number(),
    size: 40,
  }),
  helper.accessor((item) => item.graph.edges.length, {
    id: 'edges',
    ...builder.number(),
    size: 40,
  }),
];

export const WorkflowPanel = () => {
  const { space } = useDevtoolsState();
  const [displayMode, setDisplayMode] = useState(DisplayMode.COMPILED);
  const [executionMode, setExecutionMode] = useState(WorkflowDebugPanelMode.LOCAL);
  const graphs = useQuery(space, Filter.schema(ComputeGraph));
  const [selected, setSelected] = useState<ComputeGraph>();
  const [presentation, setPresentation] = useState<string | null>(null);

  const loader = useMemo(() => createLoader(graphs), [graphs]);

  useEffect(() => {
    if (!selected) {
      setPresentation(null);
      return;
    }
    toPresentation(loader, selected, displayMode)
      .then(setPresentation)
      .catch((err) => log.catch(err));
  }, [loader, selected, displayMode]);

  const objectSelect = (object: ComputeGraph) => {
    setSelected(object);
  };

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <DataSpaceSelector />
          <ControlledSelector values={Object.values(DisplayMode)} value={displayMode} setValue={setDisplayMode} />
          <ControlledSelector
            values={Object.values(WorkflowDebugPanelMode)}
            value={executionMode}
            setValue={setExecutionMode}
          />
        </Toolbar.Root>
      }
    >
      <div className={mx('flex grow', 'flex-col divide-y', 'overflow-hidden', styles.border)}>
        <Table.Root>
          <Table.Viewport asChild>
            <div className='flex-col divide-y'>
              <Table.Main<ComputeGraph>
                columns={columns}
                data={graphs}
                rowsSelectable
                currentDatum={selected}
                onDatumClick={objectSelect}
                fullWidth
              />
            </div>
          </Table.Viewport>
        </Table.Root>

        <div className={mx('flex overflow-auto', 'h-1/2')}>
          {presentation ? (
            <SyntaxHighlighter language='json'>{presentation}</SyntaxHighlighter>
          ) : (
            'Select an object to inspect the contents'
          )}
        </div>

        <div className={mx('flex overflow-auto', 'h-1/2')}>
          {selected ? (
            <WorkflowDebugPanel loader={loader} graph={selected} mode={executionMode} />
          ) : (
            'Select an object to enable executor'
          )}
        </div>
      </div>
      <div
        className={mx(
          'bs-[--statusbar-size]',
          'flex justify-end items-center gap-2',
          'bg-base text-description',
          'border-bs border-separator',
          'text-lg pointer-fine:text-xs',
        )}
      >
        <div>Objects: {graphs.length}</div>
      </div>
    </PanelContainer>
  );
};

const ControlledSelector = <T extends string>(props: { values: T[]; value: T; setValue: (newValue: T) => void }) => {
  return (
    <Select.Root value={props.value} onValueChange={props.setValue}>
      <Select.TriggerButton placeholder='Select space' />
      <Select.Portal>
        <Select.Content>
          <Select.Viewport>
            {props.values.map((mode) => (
              <Select.Option key={mode} value={mode}>
                <div className='flex items-center gap-2'>
                  <span className='font-mono text-neutral-250'>{mode}</span>
                </div>
              </Select.Option>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};

const toPresentation = async (loader: WorkflowLoader, graph: ComputeGraph, mode: DisplayMode): Promise<string> => {
  let object: any = graph;
  if (mode === DisplayMode.COMPILED) {
    object = await toWorkflow(loader, graph);
  } else if (mode === DisplayMode.GRAPH) {
    object = toCompactGraph(object);
  }
  return JSON.stringify(object, null, 2);
};

const toWorkflow = async (loader: WorkflowLoader, graph: ComputeGraph) => {
  try {
    const loaded = await loader.load(DXN.fromLocalObjectId(graph.id));
    const meta = loaded.asExecutable().meta;
    const mapProps = (ast: AST.AST) =>
      Object.fromEntries(AST.getPropertySignatures(ast).map((prop) => [prop.name, prop.type]));
    return {
      compiled: true,
      input: mapProps(meta.input.ast),
      output: mapProps(meta.output.ast),
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
    nodeResolver: async (nodeType) => {
      throw new Error(`Unknown node type: ${nodeType}.`);
    },
  });

enum DisplayMode {
  COMPILED = 'compiled',
  GRAPH = 'graph',
  RAW = 'raw',
}
