//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Autocomplete, Box, Button, Chip, TextField, Typography } from '@mui/material';

import { Dialog } from '@dxos/react-components';
import { CID, RegistryTypeRecord, Resource } from '@dxos/registry-client';
import { useRegistry } from '@dxos/react-registry-client';

export interface RegistrySearchDialogProps {
  open: boolean
  title?: string
  selectedType?: CID
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
  selectedType,
  onSearch,
  onSelect,
  onClose,
  modal
}: RegistrySearchDialogProps) => {
  const registry = useRegistry();
  const [searchInput, setSearchInput] = useState('');
  const [searchOptions, setSearchOptions] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [types, setTypes] = useState<RegistryTypeRecord[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<RegistryTypeRecord[]>([]);

  useEffect(() => {
    const loadTypes = async () => {
      const queriedTypes = await registry.getTypeRecords();
      setTypes(queriedTypes);
    }

    loadTypes();
  }, []);

  useEffect(() => {
    setImmediate(async () => {
      const resources = await onSearch(searchInput);
      let resourcesFilteredByType;
      if (selectedType) {
        resourcesFilteredByType = resources.filter(resource => {
          console.log(resource);
          console.log(selectedType)
          return resource.type === selectedType
        })
      } else {
        resourcesFilteredByType = selectedTypes.length
          ? resources.filter(resource => {
              if (!resource.type) {
                return false;
              }
              return selectedTypes.some(selectedType => selectedType.cid.equals(resource.type as CID));
            })
          : resources;
      }
      console.log(resourcesFilteredByType)
      setSearchOptions(resourcesFilteredByType);
    });
  }, [searchInput, selectedTypes]);

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
    <>
      {!selectedType && (
        <Box>
          {types.map(type => (
            <Chip
              label={type.messageName}
              sx={{
                marginRight: 1,
                bgcolor: selectedTypes.includes(type) ? 'action.active' : undefined,
                color: selectedTypes.includes(type) ? 'primary.contrastText' : undefined
              }}
              onClick={() => {
                if (selectedTypes.includes(type)) {
                  setSelectedTypes(prev => prev.filter(setSelectedType => setSelectedType !== type));
                } else {
                  setSelectedTypes([
                    ...selectedTypes,
                    type
                  ]);
                }
              }}
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
        disabled={!selectedResource}
        onClick={handleSelect}
      >
        Select
      </Button>
    </>
  );

  // return (
  //   <Dialog
  //     maxWidth='xs'
  //     modal={modal}
  //     open={open}
  //     title={title || 'Registry Search'}
  //     content={content}
  //     actions={actions}
  //   />
  // );
  return (
    <Box>
      <Typography>{title || 'Registry Search'}</Typography>
      <Box>
        {content}
      </Box>
      {/* <Box>
        {actions}
      </Box> */}
    </Box>
  );
};
