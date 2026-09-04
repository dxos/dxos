//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useObject } from '@dxos/echo-react';

import { ArchifySvg } from '#components';
import { type Diagram } from '#types';

export type DiagramCardProps = {
  subject: Diagram.Diagram;
  role?: string;
  editable?: boolean;
};

/** Card surface: the diagram alone, with the legend dropped — a card has no room to read it. */
export const DiagramCard = ({ subject }: DiagramCardProps) => {
  const [snapshot] = useObject(subject);
  if (!snapshot?.source) {
    return null;
  }

  return <ArchifySvg classNames='aspect-video' diagram={snapshot.source} hideLegend />;
};
