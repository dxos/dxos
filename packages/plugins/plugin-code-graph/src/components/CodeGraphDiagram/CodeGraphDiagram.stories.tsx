//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type Model, Semantic } from '#graph';

import { SAMPLE_FILES, SAMPLE_GRAPH } from '../../testing.ts';
import { CodeGraphDiagram } from './CodeGraphDiagram.tsx';

type StoryArgs = { graph: Model.Patch };

/** The semantic engine solves the graph once; selection maps back to the box's IRI. */
const DefaultStory = ({ graph }: StoryArgs) => {
  const { objects } = useMemo(() => Semantic.layout(graph), [graph]);
  const [selected, setSelected] = useState<string>();
  return <CodeGraphDiagram objects={objects} selected={selected} onSelect={setSelected} />;
};

const meta: Meta<StoryArgs> = {
  title: 'plugins/plugin-code-graph/components/CodeGraphDiagram',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
};

export default meta;

/** Package dependencies: no package frames, since every box is its own package. */
export const Packages: StoryObj<typeof meta> = { args: { graph: SAMPLE_GRAPH } };

/** Files of one package by import. */
export const Files: StoryObj<typeof meta> = { args: { graph: SAMPLE_FILES } };
