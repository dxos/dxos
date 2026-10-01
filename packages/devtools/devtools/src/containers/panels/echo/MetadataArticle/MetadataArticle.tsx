//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Next } from '@dxos/react-ui/next';

import { JsonView } from '../../../../components/index.ts';
import { useMetadata } from '../../../../hooks/index.ts';
import { type ArticleProps } from '../../types.ts';

export const MetadataArticle = ({ role }: ArticleProps) => {
  const metadata = useMetadata();

  return (
    <Next.Panel.Root role={role}>
      <Next.Panel.Body>
        <JsonView data={metadata} />
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};
