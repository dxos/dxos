//
// Copyright 2022 DXOS.org
//

import { UserPlus } from '@phosphor-icons/react';
import React, { ReactNode } from 'react';

import { Button, useTranslation } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { Input } from '@dxos/react-appkit';
import { Space } from '@dxos/react-client/echo';

import { SpaceListAction } from './SpaceList';
import { getIcon } from '../../hooks';
import { Intent, IntentAction } from '../../util';

export type SpaceItemProps = {
  space: Space;
  selected?: boolean;
  children?: ReactNode;
  onAction: (intent: Intent<SpaceListAction>) => void;
};

export const SpaceItem = ({ space, selected, children, onAction }: SpaceItemProps) => {
  const { t } = useTranslation('kai');
  const Icon = getIcon(space.properties.icon);

  // TODO(burdon): Use List.
  return (
    <div
      className={mx(
        'flex flex-col overflow-hidden first:mt-0 px-2 hover:bg-hover-bg',
        // TODO(burdon): Border based on space properties.
        // 'border-l-[0.25rem]', theme.classes.border,
        selected && 'z-10 hover:bg-selection-bg bg-selection-bg',
      )}
    >
      <div className={mx('flex w-full overflow-hidden px-0 items-center')}>
        <div
          className='flex flex-1 items-center overflow-hidden cursor-pointer'
          onClick={(event) =>
            onAction({
              action: IntentAction.SPACE_SELECT,
              data: { spaceKey: space.key, modifier: event.getModifierState('Shift') },
            })
          }
        >
          <div className={mx('flex m-2', selected && 'text-selection-text')}>
            <Icon className={getSize(6)} />
          </div>

          <Input
            variant='subdued'
            label='Title'
            labelVisuallyHidden
            placeholder={t('space title placeholder')}
            slots={{
              root: { className: 'w-full' },
              input: { autoFocus: !space.properties.name?.length },
            }}
            value={space.properties.name ?? ''}
            onChange={(event) => {
              space.properties.name = event.target.value;
            }}
          />
        </div>

        <Button
          variant='ghost'
          classNames={[selected ? 'flex' : 'invisible']}
          title='Share space'
          onClick={(event) =>
            onAction({
              action: IntentAction.SPACE_SHARE,
              data: { spaceKey: space.key, modifier: event.getModifierState('Shift') },
            })
          }
          data-testid='space-share'
        >
          <UserPlus className={getSize(6)} />
        </Button>
      </div>

      {selected && <div className='flex bg-paper-bg'>{children}</div>}
    </div>
  );
};
