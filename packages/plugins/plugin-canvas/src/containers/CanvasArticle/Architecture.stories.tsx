//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren, useEffect } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import * as Hooks from '@dxos/app-framework/Hooks';
import { Entity } from '@dxos/echo';
import { type URI } from '@dxos/keys';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { Cell, ModuleContainer, createStoryDecorators } from '@dxos/storybook-testing';

import { CanvasPlugin } from '#plugin';
import { translations } from '#translations';

import {
  type DiagramSet,
  architectureDiagrams,
  diagramFiles,
  edgeDiagrams,
  DIAGRAM_COMMANDS as files,
  loadDiagramSet,
} from '../../samples/architecture/index.ts';
import { canvasViewAspect } from './view-state.ts';

type StoryArgs = {
  /** The drawings open read-only: nothing is selected, and no tool, handle, port or panel edits them. */
  readonly: boolean;
};

type ReadonlyViewProps = PropsWithChildren<{ canvas: Promise<URI.URI>; readonly: boolean }>;

/** Sets the article's read-only view state once the seeded canvas exists; the view state outlives a reload, so both ways. */
const ReadonlyView = ({ canvas, readonly, children }: ReadonlyViewProps) => {
  const viewState = Hooks.useCapability(AttentionCapabilities.ViewState);
  useEffect(() => {
    // The canvas is seeded during client init, after this wrapper mounts.
    void canvas.then((contextId) => viewState.update(canvasViewAspect, contextId, (state) => ({ ...state, readonly })));
  }, [canvas, readonly, viewState]);
  return <>{children}</>;
};

// One drawing per diagram of the set; the overview opens as the article and its drill-down boxes open the others.
const withDiagrams = (set: DiagramSet) =>
  createStoryDecorators(({ args }) => {
    const canvas = Promise.withResolvers<URI.URI>();
    return {
      types: [Drawing.Drawing, Drawing.Canvas],
      plugins: [IllustratorPlugin.make(), CanvasPlugin()],
      onInit: async ({ space }) => {
        const root = await loadDiagramSet(space.db, set);
        await space.db.flush();
        const target = await root.canvas.load();
        canvas.resolve(Entity.getURI(target));
        return [[Cell.article(root)]];
      },
      Wrapper: ({ children }) => (
        <ReadonlyView canvas={canvas.promise} readonly={args.readonly === true}>
          {children}
        </ReadonlyView>
      ),
    };
  });

const meta: Meta<StoryArgs> = {
  title: 'plugins/plugin-canvas/containers/Architecture',
  render: () => <ModuleContainer />,
  args: { readonly: true },
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** Opens once the overview's drill-down boxes are frames onto their diagrams. */
const play =
  (set: DiagramSet): Story['play'] =>
  async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByTestId('scene-view', undefined, { timeout: 60_000 }),
    ).toBeInTheDocument();
    for (const box of Object.keys(set.drills[set.root])) {
      await waitFor(() => expect(canvasElement.querySelector(`[data-node-id="${box}/box"]`)).not.toBeNull(), {
        timeout: 10_000,
      });
    }
  };

const composer = architectureDiagrams(files);
const edge = edgeDiagrams(diagramFiles(files, 'edge'));

/** Composer: app layer, SDK and data, and EDGE; the framework, data, plugin, compute and EDGE boxes open a level each. */
export const Composer: Story = { decorators: withDiagrams(composer), play: play(composer) };

/** EDGE: clients, the gateway and the services; the router, db, compute and hub boxes open a level each. */
export const Edge: Story = { decorators: withDiagrams(edge), play: play(edge) };
