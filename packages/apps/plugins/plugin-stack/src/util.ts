//
// Copyright 2024 DXOS.org
//
import { type Stack as StackType } from '@braneframe/types';
import { type MetadataResolver } from '@dxos/app-framework';
import { type TFunction } from '@dxos/react-ui';
import { type StackSectionItem } from '@dxos/react-ui-stack';

export const echoSectionToNodeSection = (
  { id, object }: StackType.Section,
  t: TFunction,
  resolver?: MetadataResolver,
): StackSectionItem => {
  const metadata = resolver?.(object.type) ?? {};
  return {
    id,
    label: metadata.label,
    icon: metadata.icon,
    data: object,
  };
};
