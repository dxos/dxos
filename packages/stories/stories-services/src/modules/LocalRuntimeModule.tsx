//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Summarizer } from '../contracts/index.ts';
import * as HostController from '../hosts/HostController.ts';
import { HostCard, useHostActions } from './HostCard.tsx';
import { bindingLabel, useServices, useSnapshot } from './ServicesContext.tsx';

const FRAME_HOST = 'frame';

/**
 * Story module: the hosts on this device, which are the app and the sandboxed frame it supervises,
 * and the app's own view of where each contract is bound and which route each call took.
 */
export const LocalRuntimeModule = () => {
  const { controller } = useServices();
  const snapshot = useSnapshot();
  const actions = useHostActions();
  const local = snapshot.peers.filter((peer) => peer.kind !== 'edge');
  const hasFrame = local.some((peer) => peer.id === FRAME_HOST);
  const appGateway = snapshot.self.features.includes(Summarizer.GATEWAY_FEATURE);

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Local runtime</Toolbar.Text>
          <Button.Root
            label={hasFrame ? 'Stop frame host' : 'Start frame host'}
            onClick={() =>
              actions.run(() =>
                hasFrame
                  ? controller.stop(FRAME_HOST)
                  : controller.startFrame(FRAME_HOST, [Summarizer.GATEWAY_FEATURE], []),
              )
            }
            data-testid='toggle-frame'
          />
          <Button.Root
            label={appGateway ? 'Remove AI gateway from app' : 'Add AI gateway to app'}
            onClick={() => actions.run(() => controller.setAppGateway(!appGateway))}
            data-testid='toggle-app-gateway'
          />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='p-2 space-y-2 overflow-y-auto'>
        <p className='text-sm text-fg-muted'>
          Hosts on this device. The summarizer needs an AI gateway, so it runs only in a host that has one: add a
          gateway to the app, or start the frame host (a sandboxed iframe for untrusted plugins), then install the
          summarizer there.
        </p>
        {actions.error && (
          <p className='text-sm text-error-text' data-testid='local-runtime-error'>
            {actions.error}
          </p>
        )}
        <HostCard host={snapshot.self} onInstall={actions.install} onUninstall={actions.uninstall} />
        {local.map((peer) => (
          <HostCard
            key={peer.id}
            host={peer}
            probe={actions.probes[peer.id]}
            onInstall={actions.install}
            onUninstall={actions.uninstall}
            onProbe={actions.probe}
          />
        ))}
        <div className='text-sm space-y-1' data-testid='bindings'>
          <div className='font-medium'>Bindings in {HostController.APP_HOST}</div>
          {Object.entries(snapshot.bindings).map(([key, binding]) => (
            <div key={key}>
              {key.split('.').pop()}: {bindingLabel(binding)}
            </div>
          ))}
        </div>
        <div className='text-sm space-y-1' data-testid='calls'>
          <div className='font-medium'>Calls</div>
          {snapshot.calls.slice(0, 12).map((call, index) => (
            <div key={`${call.at}-${index}`} className='text-fg-muted'>
              {call.key.split('.').pop()}.{call.member} via {call.binding.kind} → {call.binding.hostId}
            </div>
          ))}
        </div>
      </Panel.Body>
    </Panel.Root>
  );
};
