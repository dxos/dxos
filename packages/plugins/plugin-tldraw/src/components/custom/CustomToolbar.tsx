//
// Copyright 2024 DXOS.org
//

import {
  ArrowDownToolbarItem,
  ArrowLeftToolbarItem,
  ArrowRightToolbarItem,
  ArrowToolbarItem,
  ArrowUpToolbarItem,
  AssetToolbarItem,
  CheckBoxToolbarItem,
  CloudToolbarItem,
  DiamondToolbarItem,
  DrawToolbarItem,
  EllipseToolbarItem,
  EraserToolbarItem,
  FrameToolbarItem,
  HandToolbarItem,
  HexagonToolbarItem,
  HighlightToolbarItem,
  LaserToolbarItem,
  LineToolbarItem,
  NoteToolbarItem,
  OvalToolbarItem,
  RectangleToolbarItem,
  RhombusToolbarItem,
  SelectToolbarItem,
  StarToolbarItem,
  TextToolbarItem,
  TldrawUiMenuItem,
  TriangleToolbarItem,
  XBoxToolbarItem,
  useTools,
} from '@tldraw/tldraw';
import React, { memo } from 'react';

type ToolSplice = { toolId: string; position: number };

const DefaultToolbarContent = memo(({ toolsToSplice }: { toolsToSplice: ToolSplice[] }) => {
  const tools = useTools();

  const toolNodes = [
    <SelectToolbarItem key='select' />,
    <HandToolbarItem key='hand' />,
    <DrawToolbarItem key='draw' />,
    <EraserToolbarItem key='eraser' />,
    <ArrowToolbarItem key='arrow' />,
    <TextToolbarItem key='text' />,
    <NoteToolbarItem key='note' />,
    <AssetToolbarItem key='asset' />,
    <RectangleToolbarItem key='rectangle' />,
    <EllipseToolbarItem key='ellipse' />,
    <TriangleToolbarItem key='triangle' />,
    <DiamondToolbarItem key='diamond' />,
    <HexagonToolbarItem key='hexagon' />,
    <OvalToolbarItem key='oval' />,
    <RhombusToolbarItem key='rhombus' />,
    <StarToolbarItem key='star' />,
    <CloudToolbarItem key='cloud' />,
    <XBoxToolbarItem key='xbox' />,
    <CheckBoxToolbarItem key='checkbox' />,
    <ArrowLeftToolbarItem key='arrowLeft' />,
    <ArrowUpToolbarItem key='arrowUp' />,
    <ArrowDownToolbarItem key='arrowDown' />,
    <ArrowRightToolbarItem key='arrowRight' />,
    <LineToolbarItem key='line' />,
    <HighlightToolbarItem key='highlight' />,
    <LaserToolbarItem key='laser' />,
    <FrameToolbarItem key='frame' />,
  ];

  toolsToSplice.forEach((splice) => {
    if (splice.position >= 0 && splice.position <= toolNodes.length) {
      toolNodes.splice(
        splice.position,
        0,
        <TldrawUiMenuItem key={splice.toolId} {...tools[splice.toolId as keyof typeof tools]} />,
      );
    }
  });

  return <>{toolNodes}</>;
});

DefaultToolbarContent.displayName = 'DefaultToolbarContent';

export { DefaultToolbarContent };
