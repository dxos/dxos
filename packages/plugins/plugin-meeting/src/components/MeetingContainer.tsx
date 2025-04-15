//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { DeckAction, SLUG_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { Toolbar, useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';

import { CallContainer } from './CallContainer';
import { MEETING_PLUGIN } from '../meta';
import { type MeetingType } from '../types';

export const MeetingContainer = ({ meeting }: { meeting: MeetingType }) => {
  const { t } = useTranslation(MEETING_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  return (
    <StackItem.Content toolbar={true} classNames='relative'>
      {/* TODO(thure): This should provide a more usable experience out of the box. */}
      <Toolbar.Root>
        <Toolbar.Separator variant='gap' />
        <Toolbar.IconButton
          icon='ph--book-open-text--regular'
          label={t('open meeting companions label')}
          onClick={() => {
            const id = fullyQualifiedId(meeting);
            // TODO(wittjosiah): This should not default to the summary companion but the first companion.
            return dispatch(
              createIntent(DeckAction.ChangeCompanion, {
                primary: id,
                companion: `${id}${SLUG_PATH_SEPARATOR}summary`,
              }),
            );
          }}
        />
      </Toolbar.Root>
      <CallContainer meeting={meeting} />
    </StackItem.Content>
  );
};

export default MeetingContainer;
