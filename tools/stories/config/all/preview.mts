//
// Copyright 2023 DXOS.org
//

import { type Preview } from '@storybook/react';

import { preview } from '../../.storybook/preview';

export * from '../../.storybook/preview';

export default {
  ...preview,
  parameters: {
    ...preview.parameters,
    options: {
      // This must be defined inline and may not include TS type defs.
      // https://storybook.js.org/docs/api/parameters#optionsstorysort
      // https://storybook.js.org/docs/writing-stories/naming-components-and-hierarchy#sorting-stories
      // @ts-ignore
      storySort: (a, b) => {
        return a.title === b.title ? 0 : a.id.localeCompare(b.id, undefined, { numeric: true });
      },
    },
  },
} as Preview;
