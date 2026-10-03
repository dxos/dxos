//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as StatusBar from '@dxos/plugin-status-bar/StatusBar';
import { Button, Icon, Popover, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';
import { type BeaconPeer } from '#types';

import { BeaconCapabilities } from '../capabilities/beacon-service.ts';

/** Status bar icon with popover showing live beacon peer list. */
export const BeaconStatusIndicator = () => {
  // The status bar paints with the shell, but the beacon service activates on `SpacesAvailable` — which
  // the forked client initialization can land long after — so absence is a normal early state here.
  const state = Hooks.useOptionalAtomCapability(BeaconCapabilities.State);
  const { t } = useTranslation(meta.profile.key);
  const onlineCount = state?.peers.filter((peer) => peer.online).length ?? 0;

  const iconClass = onlineCount > 0 ? 'text-green-500' : state?.status === 'connecting' ? 'animate-pulse' : undefined;

  return (
    <Popover.Root positioning={{ placement: 'left' }}>
      <Popover.Trigger asChild>
        <StatusBar.Item>
          <Button
            variant='ghost'
            icon='ph--broadcast--regular'
            iconOnly
            label={t('beacon-status.label')}
            classNames={iconClass}
          />
        </StatusBar.Item>
      </Popover.Trigger>
      <Popover.Content classNames=''>
        <BeaconPopover />
      </Popover.Content>
    </Popover.Root>
  );
};

const BeaconPopover = () => {
  const state = Hooks.useOptionalAtomCapability(BeaconCapabilities.State);
  const { t } = useTranslation(meta.profile.key);
  const onlineCount = state?.peers.filter((peer) => peer.online).length ?? 0;

  if (!state) {
    return <span className='text-sm text-fg-muted p-2'>{t('no-peers.label')}</span>;
  }

  return (
    <div className='flex flex-col gap-2 w-popover-min-width p-2'>
      {/* Header. */}
      <div className='flex items-center gap-2 mb-1'>
        <Icon icon='ph--broadcast--regular' classNames={mx(onlineCount > 0 ? 'text-green-500' : 'text-fg-muted')} />
        <span className='font-medium text-sm'>{t('beacon-title.label')}</span>
      </div>

      {/* Peer list. */}
      {state.peers.length === 0 ? (
        <span className='text-sm text-fg-muted'>{t('no-peers.label')}</span>
      ) : (
        <div className='flex flex-col gap-1'>
          {state.peers.map((peer) => (
            <PeerRow key={peer.peerId} peer={peer} />
          ))}
        </div>
      )}

      {/* Footer. */}
      <div className='border-t border-separator pt-2 mt-1 text-xs text-fg-muted flex flex-col gap-0.5'>
        <div className='flex justify-between'>
          <span>{t('transport.label')}</span>
          <span className='font-mono'>{state.transport}</span>
        </div>
        <div className='flex justify-between'>
          <span>{t('peers-summary.label')}</span>
          <span className='font-mono'>
            {onlineCount} / {state.peers.length}
          </span>
        </div>
        <div className='flex justify-between'>
          <span>{t('beacon-counter.label')}</span>
          <span className='font-mono'>#{state.localCounter}</span>
        </div>
      </div>
    </div>
  );
};

const PeerRow = ({ peer }: { peer: BeaconPeer }) => {
  return (
    <div className='flex items-center gap-2 text-sm'>
      <Icon
        icon={peer.online ? 'ph--circle-bg' : 'ph--circle--regular'}
        classNames={mx(peer.online ? 'text-green-500' : 'text-fg-muted')}
        size='xs'
      />
      <span className='truncate flex-1'>{peer.displayName ?? peer.peerId.slice(0, 8)}</span>
      <span className='font-mono text-xs text-fg-muted'>#{peer.counter}</span>
      <span className='font-mono text-xs text-fg-muted'>{peer.transport}</span>
    </div>
  );
};
