//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Autocomplete, Button, TextField } from '@mui/material';

import { Dialog } from '@dxos/react-components';
import { Resource } from '@dxos/registry-client';

export interface RegistrySearchDialogProps {
  open: boolean
  title?: string
  onSearch: (searchInput: string) => Promise<Resource[]>
  onSelect: (resource: Resource) => Promise<void>
  onClose?: () => void
  modal?: boolean
}

/**
 * Simple autocomplete search dialog for querying the DXNS registry.
 */
export const RegistrySearchDialog = ({
  open,
  title,
  onSearch,
  onSelect,
  onClose,
  modal
}: RegistrySearchDialogProps) => {
  const [searchInput, setSearchInput] = useState('');
  const [searchOptions, setSearchOptions] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  useEffect(() => {
    setImmediate(async () => {
      const resources = await onSearch(searchInput);
      setSearchOptions(resources);
    });
  }, [searchInput]);

  const handleReset = () => {
    setSearchInput('');
    setSearchOptions([]);
    setSelectedResource(null);
  };

  const handleClose = () => {
    onClose?.();
    handleReset();
  };

  const handleSelect = async () => {
    selectedResource && await onSelect?.(selectedResource);
    handleReset();
  };

  const content = (
    <Autocomplete
      fullWidth
      options={searchOptions}
      getOptionLabel={option => option.id.toString()}
      renderInput={params => (
        <TextField
          {...params}
          label='Search'
          placeholder='Search'
          variant='standard'
          autoFocus
          spellCheck={false}
        />
      )}
      inputValue={searchInput}
      onInputChange={(event, newValue) => setSearchInput(newValue)}
      value={selectedResource}
      onChange={(event, newValue) => setSelectedResource(newValue)}
    />
  );

  const actions = (
    <>
      <Button onClick={handleClose}>Close</Button>
      <Button
        disabled={!selectedResource}
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
