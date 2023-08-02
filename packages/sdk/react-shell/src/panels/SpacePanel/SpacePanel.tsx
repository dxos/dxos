//
// Copyright 2023 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React, { cloneElement, useMemo } from 'react';

import { Button, DensityProvider, Tooltip, useId, useTranslation } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';

import { ClipboardProvider, Viewport } from '../../components';
import { stepStyles } from '../../styles';
import { SpacePanelHeadingProps, SpacePanelImplProps, SpacePanelProps } from './SpacePanelProps';
import { SpaceManager } from './steps';

const SpacePanelHeading = ({ titleId, space, doneActionParent, onDone }: SpacePanelHeadingProps) => {
  const { t } = useTranslation('os');
  const name = space.properties.name;

  const doneButton = (
    <Button variant='ghost' onClick={() => onDone?.()} data-testid='show-all-spaces'>
      <X className={getSize(4)} weight='bold' />
    </Button>
  );

  return (
    <div role='none' className={mx('flex items-center p-2 gap-2')}>
      {/* TODO(wittjosiah): Label this as the space panel. */}
      <h2 id={titleId} className={mx('grow font-system-medium', !name && 'font-mono')}>
        {name ?? space.key.truncate()}
      </h2>
      <Tooltip.Root>
        <Tooltip.Content classNames='z-50'>{t('close label')}</Tooltip.Content>
        <Tooltip.Trigger asChild>
          {doneActionParent ? cloneElement(doneActionParent, {}, doneButton) : doneButton}
        </Tooltip.Trigger>
      </Tooltip.Root>
    </div>
  );
};

export const SpacePanelImpl = ({
  titleId,
  activeView,
  space,
  createInvitationUrl,
  send = () => {},
  doneActionParent,
  onDone,
}: SpacePanelImplProps) => {
  return (
    <DensityProvider density='fine'>
      <ClipboardProvider>
        <SpacePanelHeading {...{ titleId, space, doneActionParent, onDone }} />
        <Viewport.Root activeView={activeView}>
          <Viewport.Views>
            <Viewport.View id='space manager' classNames={stepStyles}>
              <SpaceManager {...{ active: activeView === 'space manager', send, space, createInvitationUrl }} />
            </Viewport.View>
            <Viewport.View {...{} /* todo(thure): Remove this unused View */} id='never' classNames={stepStyles} />
          </Viewport.Views>
        </Viewport.Root>
      </ClipboardProvider>
    </DensityProvider>
  );
};

export const SpacePanel = ({
  titleId: propsTitleId,
  createInvitationUrl = (code) => code,
  ...props
}: SpacePanelProps) => {
  const titleId = useId('spacePanel__heading', propsTitleId);
  const activeView = useMemo(() => 'space manager', []);
  return (
    <SpacePanelImpl
      {...props}
      titleId={titleId}
      activeView={activeView}
      createInvitationUrl={createInvitationUrl}
      send={() => {}}
    />
  );
};
