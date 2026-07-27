//
// Copyright 2026 DXOS.org
//

import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Color3, Color4, Vector3 } from '@babylonjs/core/Maths/math';
import { CreateLineSystem } from '@babylonjs/core/Meshes/Builders/linesBuilder';
import { type LinesMesh } from '@babylonjs/core/Meshes/linesMesh';
import { type Mesh } from '@babylonjs/core/Meshes/mesh';
import { Scene } from '@babylonjs/core/scene';
import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useRef } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { type TerraObject } from '#types';

import { createObjectForm } from './object-forms';

/** Every kind the gallery renders, left to right, in the same order `ObjectLayer` iterates. */
const KINDS: readonly TerraObject.Kind[] = ['boat', 'plane', 'satellite', 'tank', 'rocket'];

/** Horizontal spacing between adjacent objects; wide enough that hulls/wings never overlap. */
const SPACING = 2.4;

/** Neutral space backdrop, matching the planet scene's clear color. */
const BACKGROUND_COLOR = new Color4(0.043, 0.051, 0.071, 1);

/** Bright and saturated so the forward indicator reads clearly against every object's matte material. */
const ARROW_COLOR = new Color3(1, 0.3, 0.15);

/** Height above each object's own origin the forward arrow and label are drawn at, clear of every form's silhouette. */
const INDICATOR_HEIGHT = 0.55;

/**
 * Draws a thin arrow along local +Z, from just behind the object's origin out past where every
 * form's nose sits. A mis-oriented mesh is obvious because the arrow no longer points down the row.
 */
const createForwardArrow = (scene: Scene): LinesMesh => {
  const shaftEnd = 0.95;
  const headBack = 0.7;
  const headSpread = 0.12;
  const arrow = CreateLineSystem(
    'forward-arrow',
    {
      lines: [
        [new Vector3(0, 0, -0.4), new Vector3(0, 0, shaftEnd)],
        [new Vector3(-headSpread, 0, headBack), new Vector3(0, 0, shaftEnd), new Vector3(headSpread, 0, headBack)],
      ],
    },
    scene,
  );
  arrow.color = ARROW_COLOR;
  arrow.isPickable = false;
  return arrow;
};

/** A label docked above `mesh`'s on-screen projection, following the camera every frame. */
const createLabel = (adt: AdvancedDynamicTexture, mesh: Mesh, kind: TerraObject.Kind): TextBlock => {
  const label = new TextBlock(`label-${kind}`, kind);
  label.color = 'white';
  label.fontSize = 22;
  label.outlineWidth = 4;
  label.outlineColor = 'black';
  adt.addControl(label);
  label.linkWithMesh(mesh);
  label.linkOffsetY = -90;
  return label;
};

/**
 * Builds one visible instance of every object kind, laid out left to right along X. Every form
 * keeps its authored orientation (nose along +Z, no extra rotation), so the row itself is the
 * reference: a correctly oriented object's forward arrow points the same way as its neighbors'.
 */
const buildGallery = (scene: Scene, adt: AdvancedDynamicTexture): (Mesh | LinesMesh | TextBlock)[] => {
  const nodes: (Mesh | LinesMesh | TextBlock)[] = [];
  KINDS.forEach((kind, index) => {
    const offset = (index - (KINDS.length - 1) / 2) * SPACING;

    // `createObjectForm` returns the mesh hidden (isVisible = false) since the real object layer
    // only ever draws it via thin instances; the gallery wants exactly one visible instance instead.
    const form = createObjectForm(kind, scene);
    form.isVisible = true;
    form.position.x = offset;
    nodes.push(form);

    const arrow = createForwardArrow(scene);
    arrow.position.x = offset;
    arrow.position.y = INDICATOR_HEIGHT;
    nodes.push(arrow);

    nodes.push(createLabel(adt, form, kind));
  });
  return nodes;
};

const ObjectGalleryScene = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const engine = new Engine(canvas, true, { adaptToDeviceRatio: true });
    const scene = new Scene(engine);
    scene.clearColor = BACKGROUND_COLOR;

    // Radius scales with the row's width so all five objects stay framed regardless of `SPACING`.
    const rowWidth = (KINDS.length - 1) * SPACING;
    const camera = new ArcRotateCamera('camera', Math.PI * 0.6, Math.PI * 0.42, rowWidth * 1.15, Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 40;
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 40;
    camera.minZ = 0.01;

    // Same two-light matte NPR setup as the planet scene (`engine/scene-manager.ts`).
    const key = new HemisphericLight('key', new Vector3(0.5, 1, 0.4), scene);
    key.intensity = 0.95;
    key.groundColor = new Color3(0.35, 0.37, 0.42);
    const fill = new HemisphericLight('fill', new Vector3(-0.6, -0.3, -0.7), scene);
    fill.intensity = 0.25;

    const adt = AdvancedDynamicTexture.CreateFullscreenUI('object-gallery', true, scene);
    const nodes = buildGallery(scene, adt);

    const handleResize = (): void => engine.resize();
    window.addEventListener('resize', handleResize);
    engine.runRenderLoop(() => scene.render());

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.stopRenderLoop();
      nodes.forEach((node) => {
        // TextBlock has no `dispose(...)` overload matching Mesh/LinesMesh; the ADT disposes its controls itself.
        if (node instanceof TextBlock) {
          return;
        }
        node.dispose(false, true);
      });
      adt.dispose();
      scene.dispose();
      engine.dispose();
    };
  }, []);

  return (
    <div className='relative w-full h-full'>
      {/* `dx-container` (w-full h-full) is load-bearing: a bare canvas is a replaced element, so
          `absolute inset-0` alone sizes it to its HTML width/height attributes (the DPI-scaled
          render buffer `engine.resize()` sets) instead of stretching to fill the parent. */}
      <canvas ref={canvasRef} className='dx-container absolute inset-0 outline-none' style={{ touchAction: 'none' }} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-terra/scene/ObjectGallery',
  component: ObjectGalleryScene,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof ObjectGalleryScene>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One instance of every object kind (boat, plane, satellite, tank, rocket), static, no globe — for inspecting shape and forward-facing orientation. */
export const Default: Story = {};
