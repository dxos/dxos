//
// Copyright 2024 DXOS.org
//

import { DiscordLogo, Lightning, X, PaperPlaneTilt } from '@phosphor-icons/react';
import React, { type FC, type PropsWithChildren } from 'react';

import { useIntentDispatcher } from '@dxos/app-framework';
import { Button, Input, Popover, useTranslation } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { StatusBar } from './StatusBar';
import { StatusBarAction as Action, statusBarIntent as intent } from '../StatusBarPlugin';
import { STATUS_BAR_PLUGIN } from '../meta';
import { mkTranslation } from '../translations';

export const StatusBarImpl = () => {
  const dispatch = useIntentDispatcher();

  return (
    <Popover.Root>
      <StatusBar.Container>
        <StatusBar.EndContent>
          <Popover.Trigger>
            <StatusBar.Button onClick={() => dispatch(intent(Action.PROVIDE_FEEDBACK))}>
              <PaperPlaneTilt />
              <StatusBar.Text classNames='hidden sm:block'>Feedback</StatusBar.Text>
            </StatusBar.Button>
          </Popover.Trigger>
          {/* TODO(Zan): Configure this? */}
          <a href='https://discord.gg/zsxWrKjteV' target='_blank' rel='noopener noreferrer'>
            <StatusBar.Button>
              <DiscordLogo />
              <StatusBar.Text>Discord</StatusBar.Text>
            </StatusBar.Button>
          </a>
          <StatusBar.Item>
            <Lightning />
            <StatusBar.Text classNames='hidden sm:block'>Online</StatusBar.Text>
          </StatusBar.Item>
        </StatusBar.EndContent>
      </StatusBar.Container>
      <Popover.Content>
        <StatusBarForm />
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Root>
  );
};

const Section: FC<PropsWithChildren & { className?: string }> = ({ children, className }) => (
  <div role='none' className={mx(className)}>
    {children}
  </div>
);

const notImplemented = (e: any) => {
  throw new Error('Implement me');
};

const StatusBarForm = () => {
  const { t } = useTranslation(STATUS_BAR_PLUGIN);
  const translation = mkTranslation(t);

  // TODO(Zan): Fix spacing and grouping
  return (
    <div className='p-3 flex flex-col gap-2'>
      <h2 className='text-lg font-medium'>{translation('feedback panel title')}</h2>

      <Section className='space-b-1'>
        <Input.Root>
          <Input.Label>{translation('name label')}</Input.Label>
          <Input.TextInput placeholder={translation('name placeholder')} autoFocus />
        </Input.Root>
      </Section>

      <Section className='space-b-1'>
        <Input.Root>
          <Input.Label>{translation('email input label')}</Input.Label>
          <Input.TextInput placeholder={translation('email input placeholder')} autoFocus />
        </Input.Root>
      </Section>

      <Section className='space-b-1'>
        <Input.Root>
          <Input.Label>{translation('feedback text area label')}</Input.Label>
          <Input.TextArea placeholder={translation('feedback text area placeholder')} />
        </Input.Root>
      </Section>

      <Section className='space-b-2'>
        <Button variant='primary' classNames='is-full flex gap-2' onClick={notImplemented}>
          <span>{translation('send feedback label')}</span>
          <div className='grow' />
          <PaperPlaneTilt className={getSize(5)} />
        </Button>
        <Popover.Close asChild>
          <Button classNames='is-full flex gap-2'>
            <span>{t('cancel label', { ns: 'os' })}</span>
            <div className='grow' />
            <X className={getSize(5)} />
          </Button>
        </Popover.Close>
      </Section>
    </div>
  );
};
