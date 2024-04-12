//
// Copyright 2024 DXOS.org
//
import '@dxosTheme';
import React from 'react';

import { faker } from '@dxos/random';
import { Tooltip } from '@dxos/react-ui';
import { Mosaic } from '@dxos/react-ui-mosaic';
import { withTheme } from '@dxos/storybook-utils';

import type { StackSectionContent, StackSectionItem } from './Section';
import { Stack, type StackProps } from './Stack';
import { EditorContent } from '../testing/EditorContent';
import { makeColumns, createItems, TableContent, type TableContentProps } from '../testing/TableContent';

faker.seed(1234);

const ContentTypeDelegator: StackProps['SectionContent'] = (section: { data: StackSectionContent }) => {
  if ('content' in section.data) {
    return <EditorContent {...section} />;
  } else if ('columns' in section.data) {
    return <TableContent data={section.data as TableContentProps} />;
  } else {
    return null;
  }
};

const ContentTypesStoryStack = ({ items }: { items: StackSectionItem[] }) => {
  return (
    <Tooltip.Provider>
      <Mosaic.Root>
        <Mosaic.DragOverlay />
        <Stack id='stack-editors' SectionContent={ContentTypeDelegator} items={items} />
      </Mosaic.Root>
    </Tooltip.Provider>
  );
};

export default {
  title: 'react-ui-stack/ContentTypes',
  component: ContentTypesStoryStack,
  decorators: [withTheme],
};

export const Editors = {
  args: {
    items: [...Array(12)].map(() => ({
      id: faker.string.uuid(),
      object: { id: faker.string.uuid(), content: faker.lorem.paragraphs(4) },
    })),
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export const Tables = {
  args: {
    items: [...Array(12)].map(() => ({
      id: faker.string.uuid(),
      object: {
        id: faker.string.uuid(),
        columns: makeColumns(),
        data: createItems(faker.number.int({ min: 4, max: 12 })),
      },
    })),
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export const EditorsAndTables = {
  args: {
    items: [...Array(12)].map(() => ({
      id: faker.string.uuid(),
      object: {
        id: faker.string.uuid(),
        ...(faker.number.float(1) < 0.5
          ? { content: faker.lorem.paragraphs(4) }
          : { columns: makeColumns(), data: createItems(faker.number.int({ min: 4, max: 12 })) }),
      },
    })),
  },
  parameters: {
    layout: 'fullscreen',
  },
};
