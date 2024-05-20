//
// Copyright 2024 DXOS.org
//

import { DiscordLogo, Lightning, PaperPlaneTilt } from '@phosphor-icons/react';
import React from 'react';

import { Popover } from '@dxos/react-ui';

import { FeedbackForm } from './FeedbackForm';
import { StatusBar } from './StatusBar';

export const StatusBarImpl = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <StatusBar.Container>
        <StatusBar.EndContent>
          <Popover.Trigger asChild>
            <StatusBar.Button aria-label={'Give feedback about composer'}>
              <PaperPlaneTilt />
              <StatusBar.Text classNames='hidden sm:block'>Feedback</StatusBar.Text>
            </StatusBar.Button>
          </Popover.Trigger>
          {/* TODO(Zan): Configure this? */}
          <StatusBar.Button aria-label='Open DXOS Discord' asChild>
            <a href='https://discord.gg/zsxWrKjteV' target='_blank' rel='noopener noreferrer'>
              <DiscordLogo />
              <StatusBar.Text classNames='hidden sm:block'>Discord</StatusBar.Text>
            </a>
          </StatusBar.Button>
          <StatusBar.Item>
            <Lightning />
            <StatusBar.Text classNames='hidden sm:block'>Online</StatusBar.Text>
          </StatusBar.Item>
        </StatusBar.EndContent>
      </StatusBar.Container>
      <Popover.Content classNames='shadow-lg'>
        <FeedbackForm onClose={() => setOpen(false)} />
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Root>
  );
};
