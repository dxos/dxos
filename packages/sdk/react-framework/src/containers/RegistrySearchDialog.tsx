//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Autocomplete, Box, Button, Chip, TextField } from '@mui/material';

import { Dialog } from '@dxos/react-components';
import { CID, RegistryTypeRecord, Resource } from '@dxos/registry-client';
import { useRegistry } from '@dxos/react-registry-client';

export interface RegistrySearchDialogProps {
  open: boolean
  title?: string
  typeFilter?: CID[]
  onSearch: (searchInput: string) => Promise<Resource[]>
  onSelect: (resource: Resource) => Promise<void>
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
  onSearch,
  onSelect,
  onClose,
  closeOnSuccess,
  modal
}: RegistrySearchDialogProps) => {
  const registry = useRegistry();
  const [searchInput, setSearchInput] = useState('');
  const [searchOptions, setSearchOptions] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [types, setTypes] = useState<RegistryTypeRecord[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<CID[]>(typeFilter);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setImmediate(async () => {
      const queriedTypes = await registry.getTypeRecords();
      setTypes(queriedTypes);
    });
  }, []);

  useEffect(() => {
    setImmediate(async () => {
      const resources = await onSearch(searchInput);
      const resourcesFilteredByType = selectedTypes.length > 0
        ? resources.filter(resource =>
            selectedTypes.some(selectedType => resource.type && selectedType.equals(resource.type))
          )
        : resources;
      setSearchOptions(resourcesFilteredByType);
    });
  }, [searchInput, selectedTypes]);

  const handleReset = () => {
    setSearchInput('');
    setSearchOptions([]);
    setSelectedResource(null);
    setProcessing(false);
  };

  const handleClose = () => {
    onClose?.();
    handleReset();
  };

  const handleSelect = async () => {
    setProcessing(true);
    selectedResource && await onSelect?.(selectedResource);
    if (closeOnSuccess) {
      onClose?.();
    }
    handleReset();
  };

  const content = (
    <>
      {typeFilter.length === 0 && (
        // TODO(wittjosiah): Loading placeholder.
        <Box>
          {types.map(type => (
            <Chip
              key={type.messageName}
              label={type.messageName}
              sx={{
                marginBottom: 1,
                marginRight: 1,
                bgcolor: selectedTypes.includes(type.cid) ? 'action.active' : undefined,
                color: selectedTypes.includes(type.cid) ? 'primary.contrastText' : undefined
              }}
              onClick={() => setSelectedTypes(prev => {
                if (selectedTypes.includes(type.cid)) {
                  return prev.filter(setSelectedType => setSelectedType !== type.cid);
                } else {
                  return [...prev, type.cid];
                }
              })}
            />
          ))}
        </Box>
      )}
      <Autocomplete
        fullWidth
        options={searchOptions}
        getOptionLabel={option => option.id.toString()}
        renderInput={params => (
          <TextField
            {...params}
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
    </>
  );

  const actions = (
    <>
      <Button onClick={handleClose}>Close</Button>
      <Button
        disabled={!processing && !selectedResource}
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
