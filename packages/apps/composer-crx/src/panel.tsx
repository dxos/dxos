//
// Copyright 2024 DXOS.org
//

import * as Comlink from 'comlink';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import type { DevtoolsHostApi, PanelInfo, SpecNode } from '@dxos/composer-devtools-protocol';
import { log } from '@dxos/log';

import { connectDevtools } from './devtools/connect';

const SpecRenderer = ({
  node,
  onDispatch,
}: {
  node: SpecNode;
  onDispatch: (handlerId: string, payload?: unknown) => void;
}) => {
  switch (node.type) {
    case 'stack':
      return (
        <div className={node.props.direction === 'horizontal' ? 'flex flex-row gap-2' : 'flex flex-col gap-2'}>
          {node.children.map((child, index) => (
            <SpecRenderer key={index} node={child} onDispatch={onDispatch} />
          ))}
        </div>
      );
    case 'action':
      return (
        <button disabled={node.props.disabled} onClick={() => onDispatch(node.id)}>
          {node.props.name}
        </button>
      );
    case 'debug':
      return (
        <div className='font-mono whitespace-pre-wrap'>
          {node.props.label && <div className='opacity-60'>{node.props.label}</div>}
          <pre>{JSON.stringify(node.props.value, null, 2)}</pre>
        </div>
      );
    case 'input':
      return (
        <label className='flex flex-col gap-1'>
          <span>{node.props.name}</span>
          <input
            type='text'
            value={node.props.value}
            placeholder={node.props.placeholder}
            onChange={(e) => onDispatch(node.id, e.target.value)}
          />
        </label>
      );
    case 'select':
      return (
        <label className='flex flex-col gap-1'>
          <span>{node.props.name}</span>
          <select value={node.props.value} onChange={(e) => onDispatch(node.id, e.target.value)}>
            {node.props.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      );
  }
};

const PanelView = ({ remote, panel }: { remote: Comlink.Remote<DevtoolsHostApi>; panel: PanelInfo }) => {
  const [tree, setTree] = useState<SpecNode | undefined>();

  useEffect(() => {
    let subscriptionId: number | undefined;
    let cancelled = false;
    const onChange = Comlink.proxy((next: SpecNode) => {
      if (!cancelled) {
        setTree(next);
      }
    });
    void remote.subscribe(panel.id, onChange).then((id) => {
      if (cancelled) {
        void remote.unsubscribe(id);
        return;
      }
      subscriptionId = id;
    });
    return () => {
      cancelled = true;
      if (subscriptionId !== undefined) {
        void remote.unsubscribe(subscriptionId);
      }
    };
  }, [remote, panel.id]);

  if (!tree) {
    return <div>Loading {panel.name}…</div>;
  }
  return (
    <SpecRenderer
      node={tree}
      onDispatch={(handlerId, payload) => {
        void remote.dispatch(panel.id, handlerId, payload);
      }}
    />
  );
};

const Root = () => {
  const [remote, setRemote] = useState<Comlink.Remote<DevtoolsHostApi> | undefined>();
  const [panels, setPanels] = useState<PanelInfo[]>([]);
  const [active, setActive] = useState<string | undefined>();

  useEffect(() => {
    const tabId = chrome.devtools.inspectedWindow.tabId;
    const { remote: connected, disconnect } = connectDevtools(tabId);
    setRemote(connected);

    let subscriptionId: number | undefined;
    let cancelled = false;
    const onPanels = Comlink.proxy((next: PanelInfo[]) => {
      if (cancelled) {
        return;
      }
      setPanels(next);
      setActive((current) => current ?? next[0]?.id);
    });
    void connected.subscribePanels(onPanels).then((id) => {
      if (cancelled) {
        void connected.unsubscribe(id);
        return;
      }
      subscriptionId = id;
    });

    return () => {
      cancelled = true;
      if (subscriptionId !== undefined) {
        void connected.unsubscribe(subscriptionId);
      }
      disconnect();
    };
  }, []);

  if (!remote) {
    return <div>Connecting…</div>;
  }
  if (panels.length === 0) {
    return <div>No Composer devtools panels registered on this page.</div>;
  }
  const activePanel = panels.find((panel) => panel.id === active) ?? panels[0];
  return (
    <div className='flex flex-col gap-2 p-2'>
      <div className='flex gap-1'>
        {panels.map((panel) => (
          <button
            key={panel.id}
            onClick={() => setActive(panel.id)}
            className={panel.id === activePanel.id ? 'font-bold' : undefined}
          >
            {panel.name}
          </button>
        ))}
      </div>
      <PanelView key={activePanel.id} remote={remote} panel={activePanel} />
    </div>
  );
};

const main = async () => {
  log.info('panel');
  createRoot(document.getElementById('root')!).render(<Root />);
};

void main();
