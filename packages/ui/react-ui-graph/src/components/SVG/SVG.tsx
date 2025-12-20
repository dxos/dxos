//
// Copyright 2022 DXOS.org
//

import { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

import { Graph, type GraphProps as SVGGraphProps } from '../Graph';
import { Mesh, type MeshProps as SVGMeshProps } from '../Mesh';

import { Grid, type GridProps as SVGGridProps } from './Grid';
import { Markers, type MarkersProps as SVGMarkersProps } from './Markers';
import { Root, type RootProps as SVGRootProps } from './Root';
import { type ZoomProps as SVGZoomProps, Zoom } from './Zoom';

export type SVGProps = PropsWithChildren<ThemedClassName>;

export const SVG = {
  Root,
  Grid,
  Markers,
  Mesh,
  Zoom,
  Graph,
} as const;

export type { SVGRootProps, SVGGridProps, SVGMarkersProps, SVGZoomProps, SVGGraphProps, SVGMeshProps };
