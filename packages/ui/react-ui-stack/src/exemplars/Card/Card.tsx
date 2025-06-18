//
// Copyright 2025 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { type ComponentPropsWithRef, type FC } from 'react';

import { StackItem } from '../../components';

const CardRoot = StackItem.Root;

const CardContent = StackItem.Content;

const CardHeading = StackItem.Heading;

const CardHeadingLabel = StackItem.HeadingLabel;

const CardResizeHandle = StackItem.ResizeHandle;

const CardDragHandle = StackItem.DragHandle;

const CardDragPreview = StackItem.DragPreview;

const CardMenu = Primitive.div as FC<ComponentPropsWithRef<'div'>>;

const CardMedia = Primitive.img as FC<ComponentPropsWithRef<'img'>>;

export const Card = {
  Root: CardRoot,
  Content: CardContent,
  Heading: CardHeading,
  HeadingLabel: CardHeadingLabel,
  ResizeHandle: CardResizeHandle,
  DragHandle: CardDragHandle,
  DragPreview: CardDragPreview,
  Menu: CardMenu,
  Media: CardMedia,
};
