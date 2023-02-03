//
// Copyright 2023 DXOS.org
//
import React, { cloneElement, ComponentPropsWithoutRef, ReactElement } from 'react';

import { useId } from '@dxos/react-components';

type SharedTileRootProps = ComponentPropsWithoutRef<'div'>;

interface NodeLabeledTileRootProps extends SharedTileRootProps {
  label: ReactElement<{ id?: string }>;
}
interface IdLabeledTileRootProps extends SharedTileRootProps {
  labelId: string;
}

export type TileRootProps = NodeLabeledTileRootProps | IdLabeledTileRootProps;

const IdLabeledRoot = ({ labelId, children, ...props }: IdLabeledTileRootProps) => {
  return (
    <div role='group' {...props} aria-labelledby={labelId}>
      {children}
    </div>
  );
};

const NodeLabeledRoot = ({ label, children, ...props }: NodeLabeledTileRootProps) => {
  const labelId = useId('tileTitle');
  return (
    <div role='group' {...props} aria-labelledby={labelId}>
      {cloneElement(label, { id: labelId })}
      {children}
    </div>
  );
};

export const Root = (props: TileRootProps) => {
  return 'labelId' in props && props.labelId.length ? (
    <IdLabeledRoot {...(props as IdLabeledTileRootProps)} />
  ) : (
    <NodeLabeledRoot {...(props as NodeLabeledTileRootProps)} />
  );
};
