//
// Copyright 2022 DXOS.org
//

import { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

import { Graph, type GraphProps as SVGGraphProps } from '../Graph';
import { Mesh, type MeshProps as SVGMeshProps } from '../Mesh';
import { FPS, type FPSProps as SVGFPSProps } from './FPS';
import { Grid, type GridProps as SVGGridProps } from './Grid';
import { Markers, type MarkersProps as SVGMarkersProps } from './Markers';
import { Root, type RootProps as SVGRootProps } from './Root';
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

export type { SVGRootProps, SVGGridProps, SVGMarkersProps, SVGZoomProps, SVGGraphProps, SVGMeshProps, SVGFPSProps };
