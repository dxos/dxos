//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { getSpace } from '@dxos/react-client/echo';

import { SheetArticle } from '#containers';
import { type Sheet, SheetCapabilities } from '#types';

export type SheetArticleSurfaceProps = {
  role: string;
  subject: Sheet.Sheet;
  attendableId?: string;
};

/** Resolves the compute-graph registry capability, which the surface's `props` mapper cannot do. */
export const SheetArticleSurface = ({ role, subject, attendableId }: SheetArticleSurfaceProps) => {
  const computeGraphRegistry = useCapability(SheetCapabilities.ComputeGraphRegistry);

  return (
    <SheetArticle
      role={role}
      subject={subject}
      attendableId={attendableId}
      space={getSpace(subject)!}
      registry={computeGraphRegistry}
    />
  );
};
