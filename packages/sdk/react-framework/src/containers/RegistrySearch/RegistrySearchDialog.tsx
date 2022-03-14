//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Button } from '@mui/material';

import { Dialog } from '@dxos/react-components';
import { useRegistry } from '@dxos/react-registry-client';
import { CID, RegistryTypeRecord, Resource } from '@dxos/registry-client';

import { RegistrySearchPanel } from './RegistrySearchPanel';

export interface RegistrySearchDialogProps {
  open: boolean
  title?: string
  typeFilter?: CID[]
  onSelect: (resource: Resource) => void
  onClose?: () => void
  closeOnSuccess?: boolean
  modal?: boolean
}

/**
 * Simple autocomplete search dialog for querying the DXNS registry.
 */
export const RegistrySearchDialog = ({
  open,
  title,
  typeFilter = [],
  onSelect,
  onClose,
  closeOnSuccess,
  modal
}: RegistrySearchDialogProps) => {
  // TODO(burdon): Avoid hooks if able to make simpler component.
  const registry = useRegistry();
  const [selected, setSelected] = useState<Resource>();

  const handleClose = () => {
    onClose?.();
  };

  const handleSelect = async () => {
    selected && await onSelect?.(selected);
    if (closeOnSuccess) {
      onClose?.();
    }
  };

  const content = (
    <RegistrySearchPanel
      registry={registry}
      typeFilter={typeFilter}
      onSelect={selected => setSelected(selected)}
    />
  );

  const actions = (
    <>
      <Button
        onClick={handleClose}
      >
        Close
      </Button>
      <Button
        disabled={!selected}
        onClick={handleSelect}
      >
        Select
      </Button>
    </>
  );

  return (
    <Dialog
      maxWidth='xs'
      modal={modal}
      open={open}
      title={title || 'Registry Search'}
      content={content}
      actions={actions}
    />
  );
};
