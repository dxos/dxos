//
// Copyright 2024 DXOS.org
//
import React, { useCallback, useState } from 'react';

import { FolderType, type StackType, SectionType } from '@braneframe/types';
import { usePlugin, useIntent, LayoutAction } from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { Dialog, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Path } from '@dxos/react-ui-mosaic';
import { SearchList } from '@dxos/react-ui-searchlist';
import { type AddSectionPosition } from '@dxos/react-ui-stack';
import { getSize, mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { STACK_PLUGIN } from '../meta';
import { type StackPluginProvides } from '../types';

type AddSectionDialogProps = { path?: string; position: AddSectionPosition; stack: StackType };

export const dataHasAddSectionDialogProps = (data: any): data is { subject: AddSectionDialogProps } => {
  return (
    'subject' in data &&
    typeof data.subject === 'object' &&
    !!data.subject &&
    'position' in data.subject &&
    typeof data.subject.position === 'string' &&
    'stack' in data.subject
  );
};

export const AddSectionDialog = ({ path, position, stack }: AddSectionDialogProps) => {
  const { t } = useTranslation(STACK_PLUGIN);
  const stackPlugin = usePlugin<StackPluginProvides>(STACK_PLUGIN);
  const { dispatch } = useIntent();
  const space = getSpace(stack);
  const [folder] = useQuery(space, Filter.schema(FolderType));
  const [pending, setPending] = useState<boolean>(false);

  const handleAdd = useCallback(
    (sectionObject: SectionType['object']) => {
      const index =
        position === 'beforeAll'
          ? 0
          : position === 'afterAll'
            ? stack.sections.length
            : stack.sections.filter(nonNullable).findIndex((section) => section.id === Path.last(path!));

      stack.sections.splice(index + (position === 'after' ? 1 : 0), 0, create(SectionType, { object: sectionObject }));
      // TODO(wittjosiah): Remove once stack items can be added to folders separately.
      folder?.objects.push(sectionObject);
      setPending(false);
      void dispatch?.({ action: LayoutAction.SET_LAYOUT, data: { element: 'dialog', state: false } });
    },
    [stack, stack.sections, path, position, dispatch],
  );

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
        </SearchList.Content>
      </SearchList.Root>
    </Dialog.Content>
  );
};
