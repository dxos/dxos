//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/client/echo';
import { useSpaceProperties } from '@dxos/react-client/echo';
import * as Avatar from '@dxos/react-ui/Avatar';
import { getHashHue } from '@dxos/ui-theme';

import { SpaceTrigger } from './Pill.tsx';
import { PillCombobox } from './PillCombobox.tsx';

const UNTITLED_SPACE = 'Untitled space';
const NEW_SPACE = 'new-space';
const JOIN = 'join';

/** A space's name, which loads with its properties; one with none yet reads as untitled. */
export const useSpaceName = (space: Space | undefined): string => {
  const [properties] = useSpaceProperties(space?.id);
  return properties?.name || UNTITLED_SPACE;
};

/** A space's name and hue as they stand; the menu reads them each time it renders. */
export const spaceLook = (space: Space): { name: string; hue: Avatar.RootProps['hue'] } => {
  const properties = space.properties;
  return {
    name: properties.name || UNTITLED_SPACE,
    hue: Avatar.toAvatarHue(properties.hue) ?? Avatar.toAvatarHue(getHashHue(space.id)),
  };
};

/** A space's square avatar: its initial in its hue, else a hue derived from its id (spec F-3.1). */
const SpaceAvatar = ({ space }: { space: Space }) => {
  const { name, hue } = spaceLook(space);
  return <Avatar.Root variant='square' size='xs' hue={hue} fallback={name} />;
};

export type SpaceMenuProps = {
  spaces: Space[];
  current: Space;
  onSelect: (space: Space) => void;
  onCreate: () => void;
  onJoin: () => void;
};

/** The space half of the pill (spec F-3): a search over the ready spaces, then New space and Join with a link. */
export const SpaceMenu = ({ spaces, current, onSelect, onCreate, onJoin }: SpaceMenuProps) => {
  const name = useSpaceName(current);
  return (
    <PillCombobox
      trigger={<SpaceTrigger name={name} hue={spaceLook(current).hue} data-testid='diagram-app.space-menu' />}
      width='w-75'
      placeholder='Find a space'
      testId='diagram-app.space-list'
      current={current.id}
      entries={spaces.map((space) => ({
        value: space.id,
        label: spaceLook(space).name,
        leading: <SpaceAvatar space={space} />,
        testId: `diagram-app.space.${space.id}`,
      }))}
      actions={() => [
        { value: NEW_SPACE, label: 'New space', icon: 'ph--plus--regular', testId: 'diagram-app.new-space' },
        { value: JOIN, label: 'Join with a link…', icon: 'ph--link--regular', testId: 'diagram-app.join' },
      ]}
      onSelect={(id) => {
        const space = spaces.find((candidate) => candidate.id === id);
        if (space) {
          onSelect(space);
        }
      }}
      onAction={(action) => (action === NEW_SPACE ? onCreate() : action === JOIN && onJoin())}
    />
  );
};
