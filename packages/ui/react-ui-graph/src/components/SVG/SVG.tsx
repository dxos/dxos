//
// Copyright 2022 DXOS.org
//

import { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

import { type GraphProps as SVGGraphProps, Graph } from '../Graph';
import { type MeshProps as SVGMeshProps, Mesh } from '../Mesh';
import { type FPSProps as SVGFPSProps, FPS } from './FPS';
import { type GridProps as SVGGridProps, Grid } from './Grid';
import { type MarkersProps as SVGMarkersProps, Markers } from './Markers';
import { type RootProps as SVGRootProps, Root } from './Root';
import { type ZoomProps as SVGZoomProps, Zoom } from './Zoom';

export type SVGProps = PropsWithChildren<ThemedClassName>;

type SVG = {
  Root: typeof Root;
  Grid: typeof Grid;
  Markers: typeof Markers;
  Mesh: typeof Mesh;
  Zoom: typeof Zoom;
  Graph: typeof Graph;
  FPS: typeof FPS;
};

export const SVG: SVG = {
  Root,
  Grid,
  Markers,
  Mesh,
  Zoom,
  Graph,
  FPS,
};

export type { SVGFPSProps, SVGGraphProps, SVGGridProps, SVGMarkersProps, SVGMeshProps, SVGRootProps, SVGZoomProps };
