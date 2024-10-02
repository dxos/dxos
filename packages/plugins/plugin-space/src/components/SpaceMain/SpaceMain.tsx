//
// Copyright 2023 DXOS.org
//

import { Command } from '@phosphor-icons/react';
import React from 'react';

import { Surface } from '@dxos/app-framework';
import { SpaceState, type Space } from '@dxos/react-client/echo';
import { Main, useTranslation } from '@dxos/react-ui';
import { getSize, mx, topbarBlockPaddingStart } from '@dxos/react-ui-theme';
import { ClipboardProvider } from '@dxos/shell/react';

import { SpaceMembersSection } from './SpaceMembersSection';
import { SPACE_PLUGIN } from '../../meta';

const KeyShortcuts = () => {
  const { t } = useTranslation(SPACE_PLUGIN);
  return (
    <section className='mbe-4 col-span-4 md:col-start-5 md:col-end-7 grid grid-cols-subgrid gap-y-2 auto-rows-min'>
      <h2 className='contents'>
        <Command weight='duotone' className={mx(getSize(5), 'place-self-center')} />
        <span className='text-lg col-span-2 md:col-span-1'>{t('keyshortcuts label')}</span>
      </h2>
      <div role='none' className='col-start-2 col-end-4 md:col-end-5 pie-2'>
        <Surface role='keyshortcuts' />
      </div>
    </section>
  );
};

const spaceMainLayout =
  'grid gap-y-2 auto-rows-min before:bs-2 before:col-span-5 grid-cols-[var(--rail-size)_var(--rail-size)_1fr_var(--rail-size)] md:grid-cols-[var(--rail-size)_var(--rail-size)_minmax(max-content,1fr)_var(--rail-size)_var(--rail-size)_minmax(max-content,2fr)_var(--rail-size)]';

/**
 * @deprecated
 */
// TODO(wittjosiah): Remove this and re-use space members section as a deck column.
export const SpaceMain = ({ space, role }: { space: Space; role: 'main' | 'article' }) => {
  // const { graph } = useGraph();
  // const _actionsMap = graph.findNode(space.key.toHex())?.actionsMap;
  const state = space.state.get();
  const ready = state === SpaceState.SPACE_READY;
  const Root = role === 'main' ? Main.Content : 'div';
  return (
    <ClipboardProvider>
      <Root
        {...(role === 'main'
          ? { classNames: [topbarBlockPaddingStart, 'min-bs-dvh', spaceMainLayout] }
          : { role: 'none', className: mx(topbarBlockPaddingStart, 'row-span-2', spaceMainLayout) })}
        data-testid={`spacePlugin.${role}`}
        data-isready={ready ? 'true' : 'false'}
      >
        {/* {actionsMap && <InFlowSpaceActions actionsMap={actionsMap} />} */}
        {ready && <SpaceMembersSection space={space} />}
        <KeyShortcuts />
      </Root>
    </ClipboardProvider>
  );
};
