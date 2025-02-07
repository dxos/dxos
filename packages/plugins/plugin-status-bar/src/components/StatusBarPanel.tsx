//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { Surface } from '@dxos/app-framework';
import { Icon, Popover } from '@dxos/react-ui';

import { FeedbackForm } from './FeedbackForm';
import { StatusBar } from './StatusBar';

export const StatusBarPanel = ({ variant = 'main-footer' }: { variant?: 'main-footer' | 'sidebar-footer' }) => {
  const [open, setOpen] = useState(false);

  const statusbarButtons = (
    <>
      <Popover.Trigger asChild>
        <StatusBar.Button aria-label='Give feedback about composer' data-joyride='welcome/feedback'>
          <Icon icon='ph--paper-plane-tilt--regular' size={4} />
          <StatusBar.Text classNames='hidden sm:block'>Feedback</StatusBar.Text>
        </StatusBar.Button>
      </Popover.Trigger>
      {/* TODO(zan): Configure this label? */}
      <StatusBar.Button aria-label='Open DXOS Discord' asChild>
        <a href='https://dxos.org/discord' target='_blank' rel='noopener noreferrer'>
          <Icon icon='ph--discord-logo--regular' size={4} />
          <StatusBar.Text classNames='hidden sm:block'>Discord</StatusBar.Text>
        </a>
      </StatusBar.Button>
    </>
  );

  // TODO(wittjosiah): Factor out feedback and discord buttons.
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      {variant === 'sidebar-footer' ? (
        <div role='menubar' className='text-description bs-[--l0-size] flex flex-col justify-center'>
          <div role='none' className='flex justify-center'>
            {statusbarButtons}
          </div>
          <div role='none' className='flex justify-center mlb-1'>
            <Surface role='status' />
          </div>
        </div>
      ) : (
        <StatusBar.Container>
          <StatusBar.EndContent>
            <Surface role='status' />
            {statusbarButtons}
          </StatusBar.EndContent>
        </StatusBar.Container>
      )}
      <Popover.Content classNames='shadow-lg'>
        <FeedbackForm onClose={() => setOpen(false)} />
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Root>
  );
};
