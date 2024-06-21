//
// Copyright 2024 DXOS.org
//

import { DiscordLogo, PaperPlaneTilt } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { Surface } from '@dxos/app-framework';
import { Popover } from '@dxos/react-ui';

import { FeedbackForm } from './FeedbackForm';
import { StatusBar } from './StatusBar';

// TODO(wittjosiah): Rename.
export const StatusBarImpl = () => {
  const [open, setOpen] = useState(false);

  // TODO(wittjosiah): Factor out feedback and discord buttons.
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <StatusBar.Container>
        <StatusBar.EndContent>
          <Popover.Trigger asChild>
            <StatusBar.Button aria-label='Give feedback about composer'>
              <PaperPlaneTilt />
              <StatusBar.Text classNames='hidden sm:block'>Feedback</StatusBar.Text>
            </StatusBar.Button>
          </Popover.Trigger>
          {/* TODO(zan): Configure this label? */}
          <StatusBar.Button aria-label='Open DXOS Discord' asChild>
            <a href='https://discord.gg/zsxWrKjteV' target='_blank' rel='noopener noreferrer'>
              <DiscordLogo />
              <StatusBar.Text classNames='hidden sm:block'>Discord</StatusBar.Text>
            </a>
          </StatusBar.Button>
        </StatusBar.EndContent>
        <Surface role='status' />
      </StatusBar.Container>
      <Popover.Content classNames='shadow-lg'>
        <FeedbackForm onClose={() => setOpen(false)} />
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Root>
  );
};
