//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { Listbox } from '@dxos/react-ui-list';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Typography from '@dxos/react-ui/Typography';

import { translationKey } from '../../../translations.ts';
import { type JoinStepProps } from '../JoinPanelProps.ts';

export type AdditionMethodChooserProps = JoinStepProps;

type AdditionMethod = 'createIdentity' | 'acceptHaloInvitation' | 'recoverIdentity';

const isAdditionMethod = (value: string): value is AdditionMethod =>
  value === 'createIdentity' || value === 'acceptHaloInvitation' || value === 'recoverIdentity';

const TEST_IDS: Record<AdditionMethod, string> = {
  createIdentity: 'identity-chooser.create-identity',
  acceptHaloInvitation: 'identity-chooser.join-identity',
  recoverIdentity: 'identity-chooser.recover-identity',
};

/** The ways to bring an identity to this device, as a list the arrow keys move through and Enter (or a click) picks. */
export const AdditionMethodChooser = ({ active, send }: AdditionMethodChooserProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const items = useMemo(
    () => [
      {
        value: 'createIdentity',
        label: t('create-identity.label'),
        description: t('create-identity.description'),
        icon: 'ph--plus--regular',
        disabled: !active,
      },
      {
        value: 'acceptHaloInvitation',
        label: t('join-identity.label'),
        description: t('join-identity.description'),
        icon: 'ph--qr-code--regular',
        disabled: !active,
      },
      {
        value: 'recoverIdentity',
        label: t('recover-identity.label'),
        description: t('recover-identity.description'),
        icon: 'ph--textbox--regular',
        disabled: !active,
      },
    ],
    [t, active],
  );

  return (
    <Dialog.Body gap='md'>
      <Typography.Text tone='muted'>{t('addition-method-chooser.title')}</Typography.Text>
      {/* Held at no value, so every pick (even of the same option on a return to this step) reports a change. */}
      <Listbox.Root items={items} value='' onValueChange={(value) => isAdditionMethod(value) && send({ type: value })}>
        {/* Equal rows, so every option is as tall as the one whose description wraps. */}
        <Listbox.Content
          gap='sm'
          aria-label={t('addition-method-chooser.title')}
          classNames='auto-rows-fr'
          data-autofocus='choosingAuthMethod'
        >
          {items.map((item) => (
            <Listbox.Item
              key={item.value}
              id={item.value}
              highlightOnHover
              // A row stretched to the tallest one keeps its lines, and its icon and caret, in the middle.
              classNames='content-center'
              data-testid={isAdditionMethod(item.value) ? TEST_IDS[item.value] : undefined}
            >
              <Listbox.ItemIcon classNames='self-center' />
              <Listbox.ItemText />
              {/* A step smaller than the label, and up to two lines rather than one. */}
              <Listbox.ItemDescription classNames='text-sm whitespace-normal line-clamp-2' />
              <Icon.Icon icon='ph--caret-right--bold' size='md' classNames='self-center' />
            </Listbox.Item>
          ))}
        </Listbox.Content>
      </Listbox.Root>
    </Dialog.Body>
  );
};
