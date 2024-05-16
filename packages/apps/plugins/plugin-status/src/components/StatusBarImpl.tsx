//
// Copyright 2024 DXOS.org
//

import { DiscordLogo, Lightning, PaperPlaneTilt } from '@phosphor-icons/react';
import React from 'react';

import { useIntentDispatcher } from '@dxos/app-framework';
import { Popover } from '@dxos/react-ui';

import { FeedbackForm } from './FeedbackForm';
import { StatusBar } from './StatusBar';
import { StatusBarAction as Action, statusBarIntent as intent } from '../StatusBarPlugin';

export const StatusBarImpl = () => {
  const dispatch = useIntentDispatcher();

  return (
    <Popover.Root>
      <StatusBar.Container>
        <StatusBar.EndContent>
          <Popover.Trigger asChild>
            <StatusBar.Button onClick={() => dispatch(intent(Action.PROVIDE_FEEDBACK))}>
              <PaperPlaneTilt />
              <StatusBar.Text classNames='hidden sm:block'>Feedback</StatusBar.Text>
            </StatusBar.Button>
          </Popover.Trigger>
          {/* TODO(Zan): Configure this? */}
          <a href='https://discord.gg/zsxWrKjteV' target='_blank' rel='noopener noreferrer'>
            <StatusBar.Button>
              <DiscordLogo />
              <StatusBar.Text classNames='hidden sm:block'>Discord</StatusBar.Text>
            </StatusBar.Button>
          </a>
          <StatusBar.Item>
            <Lightning />
            <StatusBar.Text classNames='hidden sm:block'>Online</StatusBar.Text>
          </StatusBar.Item>
        </StatusBar.EndContent>
      </StatusBar.Container>
      <Popover.Content classNames='shadow-lg'>
        <FeedbackForm />
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Root>
  );
};
