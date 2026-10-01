//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';
import { FileUploader } from 'react-drag-drop-files';

import { Next } from '@dxos/react-ui/next';

export type DialogRestoreSpaceProps = {
  handleFile: (backupFile: File) => Promise<void>;
  /** Controlled open state. When omitted, dialog manages its own state. */
  open?: boolean;
  /** Callback for controlled open state changes. */
  onOpenChange?: (open: boolean) => void;
  /** When set, dialog shows "Import into {spaceName}" and restricts to JSON only. */
  spaceName?: string;
};

export const DialogRestoreSpace = ({ handleFile, open, onOpenChange, spaceName }: DialogRestoreSpaceProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;
  const isImportIntoExisting = !!spaceName;

  return (
    <Next.Dialog.Root open={isOpen} onOpenChange={({ open: nextOpen }) => setIsOpen(nextOpen)}>
      <Next.Toolbar.Root>
        {!isControlled && (
          <Next.Dialog.Trigger asChild>
            <Next.Button>Import space</Next.Button>
          </Next.Dialog.Trigger>
        )}
      </Next.Toolbar.Root>
      <Next.Dialog.Content>
        <Next.Dialog.Header>
          <Next.Dialog.Title>{isImportIntoExisting ? 'Import into space' : 'Import space'}</Next.Dialog.Title>
        </Next.Dialog.Header>
        <Next.Dialog.Body>
          <p className='my-4'>
            {isImportIntoExisting
              ? `Import data into ${spaceName}. Only JSON snapshots are supported.`
              : 'Importing from a backup will create new space from.'}
          </p>
          <FileUploader
            types={isImportIntoExisting ? ['json'] : ['json', 'tar']}
            classes='block my-4 p-8 border-2 border-dashed border-neutral-500/50 rounded-sm flex items-center justify-center gap-2 cursor-pointer'
            dropMessageStyle={{ border: 'none', backgroundColor: '#EEE' }}
            handleChange={(backupFile: File) => handleFile(backupFile).finally(() => setIsOpen(false))}
          >
            <Next.Icon icon='ph--file-plus--duotone' size='xl' />
            <span>
              {isImportIntoExisting ? 'Drag JSON file here or click to browse' : 'Drag file here or click to browse'}
            </span>
          </FileUploader>
        </Next.Dialog.Body>
        <Next.Dialog.Footer>
          <Next.Dialog.CloseTrigger asChild>
            <Next.Button variant='primary'>{'Cancel'}</Next.Button>
          </Next.Dialog.CloseTrigger>
        </Next.Dialog.Footer>
      </Next.Dialog.Content>
    </Next.Dialog.Root>
  );
};
