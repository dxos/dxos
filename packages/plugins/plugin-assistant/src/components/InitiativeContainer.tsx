import React, { useMemo, useState } from 'react';
import { Initiative } from '@dxos/assistant-toolkit';
import { StackItem } from '@dxos/react-ui-stack';
import { Icon, IconButton, Popover, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Surface } from '@dxos/app-framework/react';
import { Atom, useAtom, useAtomValue } from '@effect-atom/atom-react';
import { AtomObj, AtomRef } from '@dxos/echo-atom';
import { Record } from 'effect';

export type InitiativeContainerProps = {
  role?: string;
  initiative: Initiative.Initiative;
};

export const InitiativeContainer = ({ role, initiative }: InitiativeContainerProps) => {
  const [selectedTab, setSelectedTab] = useState<'initiative' | 'chat' | 'artifacts'>('initiative');

  const chat = useAtomValue(
    useMemo(
      () =>
        AtomObj.make(initiative).pipe((initiative) =>
          Atom.make((get) => {
            const chat = get(initiative).chat;
            return chat ? get(AtomRef.make(chat)) : undefined;
          }),
        ),
      [initiative],
    ),
  );
  return (
    <StackItem.Content toolbar>
      <div
        role='none'
        className='flex-1 min-is-0 overflow-x-auto scrollbar-none flex gap-1 border-b border-subduedSeparator'
      >
        <IconButton
          icon='ph--sparkle--regular'
          label='Initiative'
          variant={selectedTab === 'initiative' ? 'primary' : 'ghost'}
          onClick={() => setSelectedTab('initiative')}
        />
        <IconButton
          icon='ph--chat--regular'
          label='Chat'
          variant={selectedTab === 'chat' ? 'primary' : 'ghost'}
          onClick={() => setSelectedTab('chat')}
        />
        <IconButton
          icon='ph--list-bullets--regular'
          label='Artifacts'
          variant={selectedTab === 'artifacts' ? 'primary' : 'ghost'}
          onClick={() => setSelectedTab('artifacts')}
        />
      </div>
      {selectedTab === 'initiative' && <Surface role='section' data={{ subject: initiative }} />}
      {selectedTab === 'chat' && <Surface role='article' data={{ subject: chat }} />}
      {selectedTab === 'artifacts' && <ArtifactsStack initiative={initiative} />}
    </StackItem.Content>
  );
};

const ArtifactsStack = ({ initiative }: { initiative: Initiative.Initiative }) => {
  const artifacts = useAtomValue(
    useMemo(
      () =>
        AtomObj.make(initiative).pipe((initiative) =>
          Atom.make((get) => {
            return get(initiative).artifacts.map((artifact) => ({
              name: artifact.name,
              data: get(AtomRef.make(artifact.data)),
            }));
          }),
        ),
      [initiative],
    ),
  );

  return (
    <div>
      {artifacts.map((artifact) => (
        <StackItem.Root key={artifact.name} item={{ id: artifact.name }}>
          <StackItem.Heading>
            <StackItem.HeadingLabel>{artifact.name}</StackItem.HeadingLabel>
          </StackItem.Heading>
          <StackItem.Content>
            <Surface role='section' data={{ subject: artifact.data }} />
          </StackItem.Content>
        </StackItem.Root>
      ))}
    </div>
  );
};

export default InitiativeContainer;
