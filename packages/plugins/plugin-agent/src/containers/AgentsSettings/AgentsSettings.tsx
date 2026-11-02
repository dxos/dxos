//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Agent from '@dxos/assistant/Agent';
import { type Database, Filter, Order, Query, Type } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { log } from '@dxos/log';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { Form } from '@dxos/react-ui-form';
import { Listbox } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';

import { agentDeckSubject } from '../../constants.ts';
import { AgentNamespace } from '../../namespace.ts';
import { createAgent } from './create-agent.ts';

// The add-agent action uses Form's `settings` variant for its labeled-row chrome; there are no fields to bind.
const ACTIONS_SCHEMA = Schema.Struct({});
const ACTIONS_VALUES = {};

export type AgentsSettingsProps = Record<string, never>;

/** The space's agents: add one, open one, or delete one. */
export const AgentsSettings = (_props: AgentsSettingsProps) => {
  const { t } = UiHooks.useTranslation(AgentNamespace.key);
  const space = ToolkitHooks.useActiveSpace();
  const { invokePromise } = Hooks.useOperationInvoker();
  const agents = useQuery(space?.db, Query.select(Filter.type(Agent.Agent)).orderBy(Order.property('name', 'asc')));

  const open = useCallback(
    (id: string) => {
      if (space) {
        void invokePromise(LayoutOperation.Open, {
          subject: [agentDeckSubject(GraphPath.getSpacePath(space.db.spaceId), id)],
          navigation: 'immediate',
        });
      }
    },
    [space, invokePromise],
  );

  // Named before it is created: with the plugin's setting on, EDGE names the agent's identity and space at creation.
  const [name, setName] = useState('');
  const create = Hooks.useSpaceCallback(space?.db.spaceId, [], (db: Database.Database, agentName: string) =>
    createAgent(db, { name: agentName }),
  );
  // Set before the first await, since creation can wait up to 15 s on EDGE and a second click would add a second agent.
  const adding = useRef(false);
  const [pending, setPending] = useState(false);
  const handleAdd = useCallback(async () => {
    if (!space || adding.current) {
      return;
    }
    adding.current = true;
    setPending(true);
    try {
      const submitted = name;
      const agent = await create(space.db, submitted.trim()).catch((error) =>
        log.error('agent not created', { error }),
      );
      if (agent) {
        // Keeps a name typed for the next agent while this one was being created.
        setName((current) => (current === submitted ? '' : current));
        open(agent.id);
      }
    } finally {
      adding.current = false;
      setPending(false);
    }
  }, [space, create, name, open]);

  const handleDelete = useCallback(
    (agent: Agent.Agent) => {
      if (space) {
        void invokePromise(SpaceOperation.RemoveObjects, { objects: [agent] }, { spaceId: space.db.spaceId });
      }
    },
    [space, invokePromise],
  );

  return (
    <Form.Root variant='settings' schema={ACTIONS_SCHEMA} values={ACTIONS_VALUES}>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet label={t('agents-section.label')} description={t('agents-section.description')}>
            <Form.Field standalone label={t('add-agent.label')} description={t('add-agent.description')}>
              <Layout.Flex align='center' gap='sm'>
                <Input.Root
                  placeholder={t('new-agent.name')}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && void handleAdd()}
                  data-testid='agentPlugin.addAgentName'
                />
                <Button.Root onClick={() => void handleAdd()} disabled={pending} data-testid='agentPlugin.addAgent'>
                  {t('add-agent.button')}
                </Button.Root>
              </Layout.Flex>
            </Form.Field>
          </Form.FieldSet>

          {agents.length > 0 && (
            <Form.FieldSet label={t('agents-section.label')}>
              <Listbox.Root items={agents.map((agent) => ({ value: agent.id, label: agent.name ?? agent.id }))}>
                <Listbox.Viewport>
                  <Listbox.Content aria-label={t('agents-section.label')}>
                    {agents.map((agent) => (
                      <AgentRow key={agent.id} agent={agent} onSelect={open} onDelete={handleDelete} />
                    ))}
                  </Listbox.Content>
                </Listbox.Viewport>
              </Listbox.Root>
            </Form.FieldSet>
          )}
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

AgentsSettings.displayName = 'AgentsSettings';

type AgentRowProps = {
  agent: Agent.Agent;
  onSelect: (id: string) => void;
  onDelete: (agent: Agent.Agent) => void;
};

/** One agent row; subscribes to the agent's name so a rename re-renders only its own row. */
const AgentRow = ({ agent, onSelect, onDelete }: AgentRowProps) => {
  const { t } = UiHooks.useTranslation(AgentNamespace.key);
  const [name] = useObject(agent, 'name');
  return (
    <Listbox.Item id={agent.id} classNames='cursor-pointer' onClick={() => onSelect(agent.id)}>
      <span className='grow truncate'>
        {name || t('object-name.placeholder', { ns: Type.getTypename(Agent.Agent) })}
      </span>
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--trash--regular'
        label={t('delete-agent.label')}
        onClick={(event) => {
          // The row opens the agent; deleting must not also open it.
          event.stopPropagation();
          onDelete(agent);
        }}
      />
    </Listbox.Item>
  );
};
