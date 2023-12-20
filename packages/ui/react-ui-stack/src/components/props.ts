//
// Copyright 2023 DXOS.org
//

import type { FC, PropsWithChildren } from 'react';

import type { MosaicActiveType, MosaicContainerProps, MosaicDataItem, MosaicTileProps } from '@dxos/react-ui-mosaic';

export type StackSectionContent = MosaicDataItem & { title?: string };

export type StackContextValue<TData extends StackSectionContent = StackSectionContent> = {
  SectionContent: FC<{ data: TData }>;
  transform?: (item: MosaicDataItem, type?: string) => StackSectionItem;
  onRemoveSection?: (path: string) => void;
  onNavigateToSection?: (id: string) => void;
};

export type StackItem = MosaicDataItem &
  StackContextValue & {
    items: StackSectionItem[];
  };

export type StackSectionItem = MosaicDataItem & {
  object: StackSectionContent;
};

export type StackSectionItemWithContext = StackSectionItem & StackContextValue;

export type StackProps<TData extends StackSectionContent = StackSectionContent> = Omit<
  MosaicContainerProps<TData, number>,
  'debug' | 'Component'
> &
  StackContextValue<TData> & {
    items?: StackSectionItem[];
  };

export type SectionProps = PropsWithChildren<{
  // Data props.
  id: string;
  title: string;

  // Tile props.
  active?: MosaicActiveType;
  draggableProps?: MosaicTileProps['draggableProps'];
  draggableStyle?: MosaicTileProps['draggableStyle'];
  onRemove?: MosaicTileProps['onRemove'];
  onNavigate?: MosaicTileProps['onNavigate'];
}>;
