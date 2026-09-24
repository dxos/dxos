//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { capabilities } from '@dxos/assistant-toolkit/testing';
import { type GraphDiagnostic } from '@dxos/conductor';
import { withClientProvider } from '@dxos/react-client/testing';
import { Select, Toolbar } from '@dxos/react-ui';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { ShapeRegistry } from '@dxos/react-ui-canvas-editor';
import {
  type FreehandProjectionOptions,
  SceneView,
  createMemoryStore,
  createSceneViewAtoms,
  useRegistry,
  useSceneProjection,
} from '@dxos/react-ui-canvas/scene';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';

import { DiagnosticOverlay } from '../components/index.ts';
import { type ComputeGraphController, createComputeGraphController } from '../graph/index.ts';
import { ComputeContext } from '../hooks/index.ts';
import { computeShapes } from '../registry.ts';
import {
  createArtifactCircuit,
  createAudioCircuit,
  createBasicCircuit,
  createControlCircuit,
  createEmptyCircuit,
  createGptCircuit,
  createGPTRealtimeCircuit,
  createLogicCircuit,
  createTemplateCircuit,
  createTransformCircuit,
} from '../testing/index.ts';
import { createStoryRuntime } from '../testing/services.ts';
import { Bullets } from './Bullets.tsx';
import { computeNodeRegistry } from './defs.ts';
import { createComputeProjection } from './projection.ts';
import { sceneFromCircuit } from './scene.ts';

//
// The compute circuits on the scene engine (MIGRATION.md M3): the same controller, shapes and circuits
// as the `compute` stories, rendered by `SceneView` through the compute projection.
//

const sidebarTypes = ['scene', 'compute', 'controller', 'selected'] as const;
type Sidebar = (typeof sidebarTypes)[number];

type StoryProps = {
  controller: ComputeGraphController;
  circuit: ReturnType<typeof createEmptyCircuit>;
  sidebar?: Sidebar;
};

const DefaultStory = ({ controller, circuit, sidebar: sidebarProp }: StoryProps) => {
  const registry = useRegistry();
  const scene = useMemo(() => sceneFromCircuit(circuit), [circuit]);
  const store = useMemo(() => createMemoryStore([scene]), [scene]);
  const atoms = useMemo(() => createSceneViewAtoms(scene.id), [scene.id]);
  const createProjection = useCallback(
    (options: FreehandProjectionOptions) => createComputeProjection({ ...options, controller }),
    [controller],
  );
  const projection = useSceneProjection({ store, atoms, createProjection });
  const shapeRegistry = useMemo(() => new ShapeRegistry(computeShapes), []);
  // A function body opening grows its node through the model, so links re-route with it.
  const resize = useCallback(
    (id: string, delta: number) => {
      const node = registry.get(projection.scene).nodes[id];
      if (node) {
        projection.apply({
          kind: 'update',
          id,
          values: { size: { width: node.size.width, height: node.size.height + delta } },
        });
      }
    },
    [registry, projection],
  );

  useEffect(() => {
    void controller.open();
    return () => {
      void controller.close();
    };
  }, [controller]);

  const [diagnostics, setDiagnostics] = useState<GraphDiagnostic[]>([]);
  useEffect(() => {
    void controller.checkGraph().then(() => setDiagnostics(controller.diagnostics));
  }, [controller]);

  const [sidebar, setSidebar] = useState<Sidebar | undefined>(sidebarProp);

  return (
    <div className='grid grid-cols-[1fr_360px] dx-fill'>
      <ComputeContext.Provider value={{ controller, registry: shapeRegistry, resize }}>
        <div className={sidebar ? 'relative flex overflow-hidden' : 'relative flex overflow-hidden col-span-2'}>
          <SceneView.Root
            store={store}
            root={scene.id}
            atoms={atoms}
            nodes={computeNodeRegistry}
            projection={projection}
          >
            <SceneView.Canvas overlay={<Bullets controller={controller} projection={projection} />} />
            <SceneView.Navigation />
            <SceneView.Actions />
            <SceneView.Debug />
            <SceneView.Palette />
          </SceneView.Root>
          <DiagnosticOverlay diagnostics={diagnostics} />
        </div>
      </ComputeContext.Provider>
      {sidebar && (
        <div className='flex flex-col h-full overflow-hidden border-l border-separator'>
          <Toolbar.Root>
            <Select.Root value={sidebar} onValueChange={(value) => setSidebar(value as Sidebar)}>
              <Select.TriggerButton classNames='w-full'>{sidebar}</Select.TriggerButton>
              <Select.Portal>
                <Select.Content>
                  <Select.Viewport>
                    {sidebarTypes.map((type) => (
                      <Select.Item key={type} value={type}>
                        {type}
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </Toolbar.Root>
          <SidebarJson sidebar={sidebar} controller={controller} projection={projection} atoms={atoms} />
        </div>
      )}
    </div>
  );
};

const SidebarJson = ({
  sidebar,
  controller,
  projection,
  atoms,
}: {
  sidebar: Sidebar;
  controller: ComputeGraphController;
  projection: ReturnType<typeof useSceneProjection>;
  atoms: ReturnType<typeof createSceneViewAtoms>;
}) => {
  const scene = useAtomValue(projection.scene);
  const selection = useAtomValue(atoms.selection);
  const [selected] = [...selection];
  const node = selected ? scene.nodes[selected] : undefined;
  const json = useMemo(() => {
    switch (sidebar) {
      case 'scene':
        return { scene };
      case 'compute':
        return { graph: controller.graph };
      case 'controller':
        return { state: controller.state };
      case 'selected':
        return {
          node,
          compute:
            node && 'node' in node && typeof node.node === 'string' ? controller.graph.getNode(node.node) : undefined,
        };
    }
  }, [sidebar, scene, controller, node]);
  return (
    <Syntax.Root data={json}>
      <Syntax.Content>
        <Syntax.Filter />
        <Syntax.Viewport>
          <Syntax.Code />
        </Syntax.Viewport>
      </Syntax.Content>
    </Syntax.Root>
  );
};

const meta = {
  title: 'ui/react-ui-canvas-compute/scene',
  render: DefaultStory,
  decorators: [
    withRegistry,
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withAttention(),
    withClientProvider({ createIdentity: true, createSpace: true }),
    withPluginManager({ capabilities }),
  ],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    controller: { table: { disable: true } },
    circuit: { table: { disable: true } },
    sidebar: { control: 'select', options: [...sidebarTypes, undefined] },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The controller over the circuit; `createComputeGraph` writes each shape's compute node id first. */
const circuitArgs = (build: () => ReturnType<typeof createEmptyCircuit>): StoryProps => {
  const { controller, graph } = createComputeGraphController(build(), createStoryRuntime());
  return { controller, circuit: graph };
};

export const Default: Story = { args: circuitArgs(createEmptyCircuit) };
export const Beacon: Story = { args: circuitArgs(createBasicCircuit) };
export const Transform: Story = { args: circuitArgs(createTransformCircuit) };
export const Logic: Story = { args: circuitArgs(createLogicCircuit) };
export const Control: Story = { args: circuitArgs(createControlCircuit) };
export const Template: Story = { args: circuitArgs(createTemplateCircuit) };
export const GPT: Story = { args: circuitArgs(() => createGptCircuit({ history: true })) };
export const Plugins: Story = {
  args: circuitArgs(() => createGptCircuit({ history: true, image: true, artifact: true })),
};
export const Artifact: Story = { args: circuitArgs(createArtifactCircuit) };
export const ImageGen: Story = { args: circuitArgs(() => createGptCircuit({ image: true, artifact: true })) };
export const Audio: Story = { args: circuitArgs(createAudioCircuit) };
export const Voice: Story = { args: circuitArgs(createGPTRealtimeCircuit) };
