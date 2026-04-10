//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useAtomCapability } from '@dxos/app-framework/ui';
import { StatusBar } from '@dxos/plugin-status-bar';
import { Icon, IconButton, Popover, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { BeaconCapabilities } from '../capabilities/beacon-service';
import { type BeaconPeer } from '../types';

/** Status bar icon with popover showing live beacon peer list. */
export const BeaconStatusIndicator = () => {
  const state = useAtomCapability(BeaconCapabilities.State);
  const { t } = useTranslation(meta.id);
  const onlineCount = state.peers.filter((peer) => peer.online).length;

  const iconClass = onlineCount > 0 ? 'text-green-500' : state.status === 'connecting' ? 'animate-pulse' : undefined;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <StatusBar.Item>
          <IconButton icon='ph--broadcast--regular' iconOnly label={t('beacon-status.label')} classNames={iconClass} />
        </StatusBar.Item>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side='left' classNames=''>
          <BeaconPopover />
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

const BeaconPopover = () => {
  const state = useAtomCapability(BeaconCapabilities.State);
  const { t } = useTranslation(meta.id);
  const onlineCount = state.peers.filter((peer) => peer.online).length;

  return (
    <div className='flex flex-col gap-2 w-[280px] p-2'>
      {/* Header. */}
      <div className='flex items-center gap-2 mb-1'>
        <Icon icon='ph--broadcast--regular' classNames={mx(onlineCount > 0 ? 'text-green-500' : 'text-description')} />
        <span className='font-medium text-sm'>{t('beacon-title.label')}</span>
      </div>

      {/* Peer list. */}
      {state.peers.length === 0 ? (
        <span className='text-sm text-description'>{t('no-peers.label')}</span>
      ) : (
        <div className='flex flex-col gap-1'>
          {state.peers.map((peer) => (
            <PeerRow key={peer.peerId} peer={peer} />
          ))}
        </div>
      )}

      {/* Footer. */}
      <div className='border-t border-separator pt-2 mt-1 text-xs text-description flex flex-col gap-0.5'>
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
        icon={peer.online ? 'ph--circle-fill' : 'ph--circle--regular'}
        classNames={mx('shrink-0', peer.online ? 'text-green-500' : 'text-description')}
        size={3}
      />
      <span className='truncate flex-1'>{peer.displayName ?? peer.peerId.slice(0, 8)}</span>
      <span className='font-mono text-xs text-description'>#{peer.counter}</span>
      <span className='font-mono text-xs text-description'>{peer.transport}</span>
    </div>
  );
};
