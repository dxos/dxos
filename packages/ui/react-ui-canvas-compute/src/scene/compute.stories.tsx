//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { capabilities } from '@dxos/assistant-toolkit/testing';
import { Ref } from '@dxos/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { ComputeBoard } from '../components/index.ts';
import { type ComputeGraphController, createComputeGraphController } from '../graph/index.ts';
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
import { CanvasBoard } from '../types/index.ts';

//
// The compute circuits on the shared scene editor: each circuit as a board, edited through `LayoutIntent`s that the
// compute projection mirrors into the controller's graph.
//

type StoryProps = {
  controller: ComputeGraphController;
  board: CanvasBoard.CanvasBoard;
};

const DefaultStory = ({ controller, board }: StoryProps) => {
  useEffect(() => {
    void controller.open();
    return () => {
      void controller.close();
    };
  }, [controller]);

  return <ComputeBoard board={board} controller={controller} />;
};

const meta = {
  title: 'ui/react-ui-canvas-compute/Circuits',
  render: DefaultStory,
  decorators: [
    withRegistry,
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withAttention(),
    withClientProvider({ createIdentity: true, createSpace: true }),
    withPluginManager({ capabilities }),
  ],
  parameters: { layout: 'fullscreen', translations: uiTranslations },
  argTypes: {
    controller: { table: { disable: true } },
    board: { table: { disable: true } },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The controller over the circuit (`createComputeGraph` writes each shape's compute node id first) and its board. */
const circuitArgs = (build: () => ReturnType<typeof createEmptyCircuit>): StoryProps => {
  const { controller, graph } = createComputeGraphController(build(), createStoryRuntime());
  const board = CanvasBoard.make({
    name: 'Circuit',
    layout: { nodes: [...graph.nodes], edges: [...graph.edges] },
    computeGraph: Ref.make(controller.graph.root),
  });
  return { controller, board };
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
