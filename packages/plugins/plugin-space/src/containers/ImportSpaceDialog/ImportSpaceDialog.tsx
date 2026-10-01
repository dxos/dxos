//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';
import { FileUploader } from 'react-drag-drop-files';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { log } from '@dxos/log';
import { Flex, useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { meta } from '#meta';
import { SpaceOperation } from '#types';

export const ImportSpaceDialog = () => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();

  const [importing, setImporting] = useState<string>();

  const handleFile = useCallback(
    async (file: File) => {
      setImporting(file.name);
      let space: { id: string } | undefined;
      try {
        const contents = new Uint8Array(await file.arrayBuffer());
        const { data: result, error } = await invokePromise(SpaceOperation.ImportSpace, {
          archive: { filename: file.name, contents },
        });
        if (error) {
          throw error;
        }
        space = result?.space;
      } catch (error) {
        log.catch(error);
        await invokePromise(LayoutOperation.AddToast, {
          id: `${meta.profile.key}/import-space-failed`,
          icon: 'ph--warning--regular',
          title: ['import-space-failed.title', { ns: meta.profile.key }],
          description: error instanceof Error ? error.message : String(error),
          closeLabel: ['dismiss.label', { ns: meta.profile.key }],
        });
        return;
      } finally {
        setImporting(undefined);
      }

      // Outside the import's catch: the space already exists, so a failure here must not invite a retry that duplicates it.
      await invokePromise(LayoutOperation.UpdateDialog, { state: false });
      if (space) {
        await invokePromise(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(space.id) });
      }
    },
    [invokePromise],
  );

  return (
    <Next.Dialog.Content>
      <Next.Dialog.Header>
        <Next.Dialog.Title>{t('import-space-dialog.title')}</Next.Dialog.Title>
        <Next.Dialog.CloseTrigger asChild>
          <Next.SystemButton.Close />
        </Next.Dialog.CloseTrigger>
      </Next.Dialog.Header>
      <Next.Dialog.Body>
        <p className='my-4'>{t('import-space-dialog.description')}</p>
        {importing ? (
          <Flex
            align='center'
            justify='center'
            gap='sm'
            asChild
            role='status'
            classNames='my-4 p-8 border-2 border-dashed border-neutral-500/50 rounded-sm'
          >
            <div>
              <Next.Icon icon='ph--spinner-gap--regular' size='xl' spin />
              <span>{t('import-space-dialog.importing.label', { filename: importing })}</span>
            </div>
          </Flex>
        ) : (
          <FileUploader
            types={['json', 'tar']}
            classes='block my-4 p-8 border-2 border-dashed border-neutral-500/50 rounded-sm flex items-center justify-center gap-2 cursor-pointer'
            dropMessageStyle={{ border: 'none', backgroundColor: '#EEE' }}
            handleChange={(file: File) => {
              void handleFile(file);
            }}
          >
            <Next.Icon icon='ph--file-plus--duotone' size='xl' />
            <span>{t('import-space-dialog.upload.label')}</span>
          </FileUploader>
        )}
      </Next.Dialog.Body>
      <Next.Dialog.Footer>
        <Next.Dialog.CloseTrigger asChild>
          <Next.Button variant='primary'>{t('cancel.label')}</Next.Button>
        </Next.Dialog.CloseTrigger>
      </Next.Dialog.Footer>
    </Next.Dialog.Content>
  );
};

ImportSpaceDialog.displayName = 'ImportSpaceDialog';
