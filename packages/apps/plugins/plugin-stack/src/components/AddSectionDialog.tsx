//
// Copyright 2024 DXOS.org
//
import React from 'react';

import { usePlugin } from '@dxos/app-framework';
import { Dialog, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { SearchList } from '@dxos/react-ui-searchlist';
import { type AddSectionPosition } from '@dxos/react-ui-stack';
import { getSize, mx } from '@dxos/react-ui-theme';

import { STACK_PLUGIN } from '../meta';
import { type StackPluginProvides } from '../types';

type AddSectionDialogProps = { path?: string; position: AddSectionPosition };

export const dataHasAddSectionDialogProps = (data: any): data is { subject: AddSectionDialogProps } => {
  return (
    'subject' in data &&
    typeof data.subject === 'object' &&
    !!data.subject &&
    'position' in data.subject &&
    typeof data.subject.position === 'string'
  );
};

export const AddSectionDialog = ({ path, position }: AddSectionDialogProps) => {
  const { t } = useTranslation(STACK_PLUGIN);
  const stackPlugin = usePlugin<StackPluginProvides>(STACK_PLUGIN);
  return (
    <Dialog.Content>
      <Dialog.Title>{t(`add section ${position} dialog title`)}</Dialog.Title>
      <SearchList.Root label={t('add section input placeholder')}>
        <SearchList.Input placeholder={t('add section input placeholder')} classNames='pli-3' />
        <SearchList.Content classNames='min-bs-[12rem] bs-[50dvh] max-bs-[30rem] overflow-auto'>
          {stackPlugin?.provides?.stack.creators?.map(({ id, icon: Icon, label: propsLabel }) => {
            const label = toLocalizedString(propsLabel, t);
            return (
              <SearchList.Item
                value={label}
                key={id}
                onSelect={() => {
                  // TODO(thure): Create section
                }}
                classNames='flex items-center gap-2 pli-2'
              >
                {Icon && <Icon className={mx(getSize(4), 'shrink-0')} />}
                <span className='grow truncate'>{label}</span>
              </SearchList.Item>
            );
          })}
        </SearchList.Content>
      </SearchList.Root>
    </Dialog.Content>
  );
};
