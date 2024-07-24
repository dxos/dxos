//
// Copyright 2024 DXOS.org
//

import { FilePlus } from '@phosphor-icons/react';
import React, { useCallback, useRef, useState } from 'react';

import { FileType, StackViewType, type CollectionType } from '@braneframe/types';
import { usePlugin, useIntent, LayoutAction, useResolvePlugin, parseFileManagerPlugin } from '@dxos/app-framework';
import { type EchoReactiveObject, create } from '@dxos/echo-schema';
import { getSpace } from '@dxos/react-client/echo';
import { Dialog, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Path } from '@dxos/react-ui-mosaic';
import { SearchList } from '@dxos/react-ui-searchlist';
import { type AddSectionPosition } from '@dxos/react-ui-stack';
import { getSize, mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { STACK_PLUGIN } from '../meta';
import { type StackPluginProvides } from '../types';

type AddSectionDialogProps = { path?: string; position: AddSectionPosition; collection: CollectionType };

export const dataHasAddSectionDialogProps = (data: any): data is { subject: AddSectionDialogProps } => {
  return (
    'subject' in data &&
    typeof data.subject === 'object' &&
    !!data.subject &&
    'position' in data.subject &&
    typeof data.subject.position === 'string' &&
    'collection' in data.subject
  );
};

export const AddSectionDialog = ({ path, position, collection }: AddSectionDialogProps) => {
  const { t } = useTranslation(STACK_PLUGIN);
  const stackPlugin = usePlugin<StackPluginProvides>(STACK_PLUGIN);
  const fileManagerPlugin = useResolvePlugin(parseFileManagerPlugin);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { dispatch } = useIntent();
  const space = getSpace(collection);
  const [pending, setPending] = useState<boolean>(false);

  const handleAdd = useCallback(
    (sectionObject: EchoReactiveObject<any>) => {
      const index =
        position === 'beforeAll'
          ? 0
          : position === 'afterAll'
            ? collection.objects.length
            : collection.objects.filter(nonNullable).findIndex((section) => section.id === Path.last(path!));

      collection.objects.splice(index + (position === 'after' ? 1 : 0), 0, sectionObject);
      const stack = collection.views[StackViewType.typename];
      if (stack) {
        stack.sections[sectionObject.id] = {};
      }
      setPending(false);
      void dispatch?.({ action: LayoutAction.SET_LAYOUT, data: { element: 'dialog', state: false } });
    },
    [collection, path, position, dispatch],
  );

  const handleFileUpload =
    fileManagerPlugin?.provides.file.upload && space
      ? async (file: File) => {
          const filename = file.name.split('.')[0];
          const info = await fileManagerPlugin.provides.file.upload?.(file, space);
          if (info) {
            const obj = create(FileType, { type: file.type, name: filename, filename, cid: info.cid });
            handleAdd(obj);
          }
        }
      : undefined;

  return (
    <Dialog.Content>
      <Dialog.Title>{t(`add section ${position} dialog title`)}</Dialog.Title>
      <SearchList.Root label={t('add section input placeholder')}>
        <SearchList.Input placeholder={t('add section input placeholder')} classNames='pli-3' disabled={pending} />
        <SearchList.Content classNames='min-bs-24 bs-fit max-bs-48 overflow-auto' {...(pending && { inert: 'true' })}>
          {stackPlugin?.provides?.stack.creators?.map(({ id, icon: Icon, label: propsLabel, testId, intent }) => {
            const label = toLocalizedString(propsLabel, t);
            return (
              <SearchList.Item
                value={label}
                key={id}
                onSelect={async () => {
                  setPending(true);
                  const { data: nextSection } = (await dispatch(intent)) ?? {};
                  handleAdd(nextSection);
                }}
                classNames='flex items-center gap-2 pli-2'
                data-testid={testId}
              >
                {Icon && <Icon className={mx(getSize(4), 'shrink-0')} />}
                <span className='grow truncate'>{label}</span>
              </SearchList.Item>
            );
          })}
          {handleFileUpload && (
            <SearchList.Item
              value={t('upload file label')}
              classNames='flex items-center gap-2 pli-2'
              onSelect={() => fileRef.current?.click()}
            >
              <FilePlus />
              <span className='grow truncate'>{t('upload file label')}</span>
            </SearchList.Item>
          )}
        </SearchList.Content>
      </SearchList.Root>
      {handleFileUpload && (
        <input
          type='file'
          className='sr-only'
          ref={fileRef}
          onChange={({ target: { files } }) => files && handleFileUpload(files[0])}
        />
      )}
    </Dialog.Content>
  );
};
