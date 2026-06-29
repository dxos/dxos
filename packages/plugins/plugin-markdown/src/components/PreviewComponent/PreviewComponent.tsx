//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { URI } from '@dxos/keys';
import { useClient } from '@dxos/react-client';
import { type XmlWidgetProps } from '@dxos/ui-editor';

export type PreviewComponentProps = XmlWidgetProps<{
  label: string;
  dxn: string;
  block?: boolean;
  suggest?: boolean;
}>;

/**
 * Registry-backed block widget for URL-scheme preview slots.
 * Replaces the addBlockContainer callback pattern.
 * Used as the Component entry in a urlSchemes XmlWidgetDef.
 */
export const PreviewComponent = ({ dxn }: PreviewComponentProps) => {
  const client = useClient();
  const uri = dxn ? URI.make(dxn) : undefined;
  const subject = uri ? client.graph.makeRef(uri).target : undefined;
  const data = useMemo(() => (subject ? { subject, attendableId: dxn } : undefined), [subject, dxn]);
  if (!uri || !data) {
    return null;
  }
  return <Surface.Surface type={AppSurface.Section} data={data} limit={1} />;
};
