//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as StatusBar from '@dxos/plugin-status-bar/StatusBar';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Popover from '@dxos/react-ui/Popover';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';
import { type BeaconPeer } from '#types';

import { BeaconCapabilities } from '../capabilities/beacon-service.ts';

/** Status bar icon with popover showing live beacon peer list. */
export const BeaconStatusIndicator = () => {
  // The status bar paints with the shell, but the beacon service activates on `SpacesAvailable` — which
  // the forked client initialization can land long after — so absence is a normal early state here.
  const state = Hooks.useOptionalAtomCapability(BeaconCapabilities.State);
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const onlineCount = state?.peers.filter((peer) => peer.online).length ?? 0;

  const iconClass =
    onlineCount > 0 ? 'text-success-text' : state?.status === 'connecting' ? 'animate-pulse' : undefined;

  return (
    <Popover.Root positioning={{ placement: 'left' }}>
      <Popover.Trigger asChild>
        <StatusBar.Item>
          <Button.Root
            variant='ghost'
            icon='ph--broadcast--regular'
            iconOnly
            label={t('beacon-status.label')}
            classNames={iconClass}
          />
        </StatusBar.Item>
      </Popover.Trigger>
      <Popover.Content>
        <BeaconPopover />
      </Popover.Content>
    </Popover.Root>
  );
};

const BeaconPopover = () => {
  const state = Hooks.useOptionalAtomCapability(BeaconCapabilities.State);
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const onlineCount = state?.peers.filter((peer) => peer.online).length ?? 0;

  if (!state) {
    return <span className='text-sm text-fg-muted p-2'>{t('no-peers.label')}</span>;
  }

  return (
    <Layout.Flex column gap='sm' classNames='w-popover-min-width p-2'>
      {/* Header. */}
      <Layout.Flex align='center' gap='sm' classNames='mb-1'>
        <Icon.Icon
          icon='ph--broadcast--regular'
          classNames={mx(onlineCount > 0 ? 'text-success-text' : 'text-fg-muted')}
        />
        <span className='font-medium text-sm'>{t('beacon-title.label')}</span>
      </Layout.Flex>

      {/* Peer list. */}
      {state.peers.length === 0 ? (
        <span className='text-sm text-fg-muted'>{t('no-peers.label')}</span>
      ) : (
        <Layout.Flex column gap='xs'>
          {state.peers.map((peer) => (
            <PeerRow key={peer.peerId} peer={peer} />
          ))}
        </Layout.Flex>
      )}

      {/* Footer. */}
      <Layout.Flex column classNames='border-t border-separator pt-2 mt-1 text-xs text-fg-muted gap-0.5'>
        <Layout.Flex justify='between'>
          <span>{t('transport.label')}</span>
          <span className='font-mono'>{state.transport}</span>
        </Layout.Flex>
        <Layout.Flex justify='between'>
          <span>{t('peers-summary.label')}</span>
          <span className='font-mono'>
            {onlineCount} / {state.peers.length}
          </span>
        </Layout.Flex>
        <Layout.Flex justify='between'>
          <span>{t('beacon-counter.label')}</span>
          <span className='font-mono'>#{state.localCounter}</span>
        </Layout.Flex>
      </Layout.Flex>
    </Layout.Flex>
  );
};

const PeerRow = ({ peer }: { peer: BeaconPeer }) => {
  return (
    <Layout.Flex align='center' gap='sm' classNames='text-sm'>
      <Icon.Icon
        icon={peer.online ? 'ph--circle-bg' : 'ph--circle--regular'}
        classNames={mx(peer.online ? 'text-success-text' : 'text-fg-muted')}
        size='xs'
      />
      <span className='truncate flex-1'>{peer.displayName ?? peer.peerId.slice(0, 8)}</span>
      <span className='font-mono text-xs text-fg-muted'>#{peer.counter}</span>
      <span className='font-mono text-xs text-fg-muted'>{peer.transport}</span>
    </Layout.Flex>
  );
};
