//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Panel from '@dxos/react-ui/Panel';
import * as Select from '@dxos/react-ui/Select';
import * as Tag from '@dxos/react-ui/Tag';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { PERMISSION_OPTIONS, type PermissionId } from '../testing/index.ts';
import { type LocationKind } from './types.ts';

/** Prompts that each exercise one permission, so a run shows a pass or a refusal at a glance. */
export const PERMISSION_PROMPTS: readonly string[] = [
  'List the organizations in the database.',
  'Mark Acme Robotics as an active customer.',
  'Run `uname -a` in the sandbox.',
];

const LOCATIONS: { value: LocationKind; label: string }[] = [
  { value: 'local', label: 'Local' },
  { value: 'edge', label: 'EDGE' },
];

export type PermissionConfiguratorProps = {
  /** Offer EDGE as a location; otherwise every agent spawns locally. */
  edge?: boolean;
  /** False until the runtime, the space and the identity exist. */
  ready?: boolean;
  onSpawn: (config: { prompt: string; permissions: PermissionId[]; location: LocationKind }) => void;
};

/** Configures and spawns an agent: its prompt, the permissions its process is granted, and where it runs. */
export const PermissionConfigurator = ({ edge = false, ready = true, onSpawn }: PermissionConfiguratorProps) => {
  const [prompt, setPrompt] = useState('');
  const [permissions, setPermissions] = useState<PermissionId[]>(['read']);
  const [location, setLocation] = useState<LocationKind>('local');
  const text = prompt.trim();

  const handleSpawn = () => {
    if (!ready || !text) {
      return;
    }
    onSpawn({ prompt: text, permissions, location: edge ? location : 'local' });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      handleSpawn();
    }
  };

  const toggle = (id: PermissionId, checked: boolean) =>
    setPermissions((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((value) => value !== id)));

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Button.Root
            icon='ph--play--regular'
            label='Spawn agent'
            disabled={!ready || !text}
            onClick={handleSpawn}
            data-testid='permission-spawn'
          />
          {edge && (
            <Select.Root
              items={LOCATIONS}
              value={[location]}
              onValueChange={({ value: [value] }) => {
                const next = LOCATIONS.find((item) => item.value === value);
                if (next) {
                  setLocation(next.value);
                }
              }}
            >
              <Select.Trigger data-testid='permission-location' />
              <Select.Content>
                {LOCATIONS.map((item) => (
                  <Select.Item key={item.value} item={item} />
                ))}
              </Select.Content>
            </Select.Root>
          )}
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='p-2 space-y-4 overflow-y-auto'>
        <section className='space-y-2'>
          <h2 className='text-sm text-fg-muted'>Prompt</h2>
          <Input.Textarea
            autoResize
            rows={3}
            placeholder='Ask the agent to do something...'
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={handleKeyDown}
            data-testid='permission-prompt'
          />
          <div className='flex flex-wrap gap-1'>
            {PERMISSION_PROMPTS.map((sample) => (
              <Tag.Tag key={sample} onClick={() => setPrompt(sample)} data-testid='permission-sample'>
                {sample}
              </Tag.Tag>
            ))}
          </div>
        </section>
        <section className='space-y-1' data-testid='permission-grants'>
          <h2 className='text-sm text-fg-muted'>Grant the agent's process</h2>
          {PERMISSION_OPTIONS.map(({ id, label, command, description }) => (
            <div key={id} className='flex items-center gap-2'>
              <Input.Checkbox
                label={label}
                checked={permissions.includes(id)}
                onCheckedChange={({ checked }) => toggle(id, checked === true)}
                data-testid={`permission-${id}`}
              />
              <span className='font-mono text-xs text-fg-muted truncate' title={description}>
                {command}
              </span>
            </div>
          ))}
        </section>
        <section className='space-y-2 text-sm text-fg-muted'>
          <p className='flex gap-2'>
            <Icon.Icon icon='ph--laptop--regular' classNames='mt-0.5 shrink-0' />
            <span>
              Local: the agent and every tool call it makes run in this page, as processes holding a guard with exactly
              the checked grants. A tool whose operation declares a permission the grants do not cover is refused before
              its handler runs.
            </span>
          </p>
          {edge && (
            <p className='flex gap-2' data-testid='permission-edge-note'>
              <Icon.Icon icon='ph--cloud--regular' classNames='mt-0.5 shrink-0' />
              <span>
                EDGE: a guard is a closure and is not sent with the spawn, and deployed EDGE runs published packages
                that predate this check, with its own undeclared copies of the database tools. An EDGE agent runs them
                unchecked, whatever is ticked here; the sandbox stand-in does not exist there at all.
              </span>
            </p>
          )}
          <p className='flex gap-2'>
            <Icon.Icon icon='ph--terminal-window--regular' classNames='mt-0.5 shrink-0' />
            <span>
              Sandbox exec is a stand-in that runs a few shell builtins in the page; the real Cloudflare sandbox needs
              an EDGE sandbox object. It declares the same /sandbox/exec permission.
            </span>
          </p>
        </section>
      </Panel.Body>
    </Panel.Root>
  );
};
