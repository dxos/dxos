//
// Copyright 2022 DXOS.org
//

import { UserPlus } from 'phosphor-react';
import React, { ReactNode, Suspense } from 'react';

import { Space } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { withReactor } from '@dxos/react-client';
import { Button, getSize, Input, mx, useTranslation } from '@dxos/react-components';

import { getIcon, useAppRouter } from '../../hooks';
import { Intent, IntentAction } from '../../util';

export type SpaceItemProps = {
  space: Space;
  selected?: boolean;
  children?: ReactNode;
  onAction: (intent: Intent<SpaceListAction>) => void;
};

// TODO(burdon): Repurposable panel (compact, vs full mode). Tile?
// TODO(burdon): Editable space name?
// TODO(burdon): Action menu.
const SpaceItem = withReactor(({ space, selected, children, onAction }: SpaceItemProps) => {
  const { t } = useTranslation('kai');
  const Icon = getIcon(space.properties.icon);

  // TODO(burdon): Use List.
  return (
    <div
      // style={{ marginTop: -1 }}
      className={mx(
        'flex flex-col overflow-hidden border first:mt-0 mt-[-1px]',
        'hover:bg-selection-hover',
        selected && 'z-10 hover:bg-selection-bg bg-selection-bg border-selection-border'
      )}
    >
      <div className={mx('flex w-full overflow-hidden px-0 items-center')}>
        <div
          className='flex flex-1 items-center overflow-hidden cursor-pointer'
          onClick={(event) =>
            onAction({
              action: IntentAction.SPACE_SELECT,
              data: { spaceKey: space.key, modifier: event.getModifierState('Shift') }
            })
          }
        >
          <div className={mx('flex m-2', selected && 'text-selection-text')}>
            <Icon className={getSize(6)} />
          </div>

          <Input
            variant='subdued'
            value={space.properties.name}
            onChange={(event) => {
              space.properties.name = event.target.value;
            }}
            label='Title'
            placeholder={t('space title placeholder')}
            slots={{
              label: { className: 'sr-only' },
              input: { autoFocus: !space.properties.name?.length },
              root: {
                className: 'm-0'
              }
            }}
          />
        </div>

        <Button
          compact
          variant='ghost'
          className={mx(selected ? 'flex' : 'invisible')}
          title='Share space'
          onClick={(event) =>
            onAction({
              action: IntentAction.SPACE_SHARE,
              data: { spaceKey: space.key, modifier: event.getModifierState('Shift') }
            })
          }
          data-testid='space-settings'
        >
          <UserPlus className={getSize(6)} />
        </Button>
      </div>

      {selected && <div className='flex bg-paper-bg'>{children}</div>}
    </div>
  );
});

export type SpaceListAction = {
  spaceKey: PublicKey;
  modifier?: boolean;
};

export type SpaceListProps = {
  spaces: Space[];
  selected?: PublicKey;
  onAction?: (intent: Intent<SpaceListAction>) => void;
};

export const SpaceList = ({ spaces, selected, onAction }: SpaceListProps) => {
  const { frame } = useAppRouter();
  const Tile = frame?.runtime.Tile;

  return (
    <div className='flex flex-col flex-1 overflow-hidden m-2'>
      {spaces.map((space) => (
        <SpaceItem
          key={space.key.toHex()}
          space={space}
          selected={selected && space.key.equals(selected)}
          onAction={(intent) => onAction?.(intent)}
        >
          <Suspense>{Tile && <Tile />}</Suspense>
        </SpaceItem>
      ))}
    </div>
  );
};
