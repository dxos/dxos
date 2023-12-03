//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type TypedObject } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { baseSurface, topbarBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { Diagram } from './Diagram/Diagram';

export const MermaidMain: FC<{ object: TypedObject }> = ({ object }) => {
  const content = 'graph TD; A-->B; A-->C; B-->D; C-->D; D-->E; C-->B; B-->E;';

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      <Diagram content={content} />
    </Main.Content>
  );
};

export const MermaidSection: FC<{ object: TypedObject }> = ({ object }) => {
  const content = 'graph TD; A-->B; A-->C; B-->D; C-->D; D-->E; C-->B; B-->E;';

  return <Diagram content={content} />;
};
