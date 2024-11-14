//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { faker } from '@dxos/random';
import { Mosaic } from '@dxos/react-ui-mosaic';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import type { StackSectionContent, StackSectionItem } from './Section';
import { Stack, type StackProps } from './Stack';
import { EditorContent } from '../testing/EditorContent';

faker.seed(1234);

const ContentTypeDelegator: StackProps['SectionContent'] = (section: { data: StackSectionContent }) => {
  if ('content' in section.data) {
    return <EditorContent {...section} />;
  } else {
    return null;
  }
};

const ContentTypesStoryStack = ({ items }: { items: StackSectionItem[] }) => {
  return (
    <Mosaic.Root>
      <Mosaic.DragOverlay />
      <Stack
        id='stack-editors'
        SectionContent={ContentTypeDelegator}
        items={items}
        classNames='max-is-[min(100dvw,60rem)]'
      />
    </Mosaic.Root>
  );
};

export default {
  title: 'ui/react-ui-stack/ContentTypes',
  component: ContentTypesStoryStack,
  decorators: [withTheme, withLayout({ tooltips: true })],
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
