//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Project from '@dxos/compute/Project';
import { Filter } from '@dxos/echo';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { type Client, useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { Select, Toolbar, useAsyncEffect } from '@dxos/react-ui';

import { VOYAGE_SPACE_ID } from '../testing/voyage-space';

/**
 * Story chrome: a picker over the contributed space templates
 * ({@link SpaceCapabilities.SpaceTemplate}) above the story's grid, plus a reset.
 *
 * Space templates rather than project templates, because a project only means something with the
 * data it works over: the template brings the mailbox, the accounts and the documents into the
 * space alongside the project, so every column has something real to show.
 *
 * Each template gets its own space, named after it. Picking one opens that space when it exists and
 * creates it otherwise, so the story keeps every template's work side by side on a persistent
 * client instead of one template's content overwriting the last. Reset wipes the profile and
 * reloads, which is the way back to an empty client.
 */
export const SpaceTemplateToolbar = () => (
  <Toolbar.Root>
    <TemplateSelect />
  </Toolbar.Root>
);

const TemplateSelect = () => {
  const client = useClient();
  const templates = useCapabilities(SpaceCapabilities.SpaceTemplate);
  const { invokePromise } = useOperationInvoker();
  const [templateId, setTemplateId] = useState(VOYAGE_SPACE_ID);
  // Guards the seed effect against the re-renders between an open starting and its space landing.
  const busy = useRef(false);

  const sorted = useMemo(
    () => [...templates].sort((left, right) => left.label.localeCompare(right.label)),
    [templates],
  );

  /** Points the story's columns at a space; `useActiveSpace` is what the modules read. */
  const showSpace = useCallback(
    async (space: Space) => {
      await invokePromise(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(space.id) });
    },
    [invokePromise],
  );

  /** Creates a fresh chat over the space's project, the way opening a project chat does in the app. */
  const bindChat = useCallback(
    async (space: Space) => {
      // Indexed first: the query behind the binding reads the index, and a template whose content
      // has not landed there yet would leave the chat bound to nothing, silently.
      await space.db.flush({ indexes: true });
      const [project] = await space.db.query(Filter.type(Project.Project)).run();
      const created = await invokePromise(AssistantOperation.CreateChat, {}, { spaceId: space.id });
      if (created.error || !created.data) {
        throw created.error ?? new Error('Chat was not created.');
      }
      // The operation returns the chat unfiled, for the caller to persist.
      const chat = space.db.add(created.data.object);
      if (project) {
        await invokePromise(AssistantOperation.BindChatContext, { chat, subject: project }, { spaceId: space.id });
      }
    },
    [invokePromise],
  );

  const handleSelect = useCallback(
    async (id: string) => {
      const template = templates.find((template) => template.id === id);
      if (!template || busy.current) {
        return;
      }
      busy.current = true;
      setTemplateId(id);
      try {
        const existing = findTemplateSpace(client, template.label);
        if (existing) {
          await existing.waitUntilReady();
          await showSpace(existing);
          return;
        }

        // The app's own create path: it makes the root collection a template writes into, runs the
        // template's `apply`, and fires the space-created callbacks.
        const created = await invokePromise(SpaceOperation.Create, { name: template.label, template: template.id });
        if (created.error || !created.data) {
          throw created.error ?? new Error(`Space was not created: ${template.label}`);
        }
        const space = client.spaces.get(created.data.space.id);
        if (!space) {
          throw new Error(`Created space is not in the client: ${template.label}`);
        }
        await space.waitUntilReady();
        await showSpace(space);
        await bindChat(space);
      } finally {
        busy.current = false;
      }
    },
    [client, templates, invokePromise, showSpace, bindChat],
  );

  /** Wipes the profile and reloads, the way the other stories reset a persistent client. */
  const handleReset = useCallback(async () => {
    await client.reset();
    window.location.reload();
  }, [client]);

  // Open the default template's space, so the story starts on a bound conversation. Gated on that
  // template rather than on any: each contributing module activates on its own, so the samples can
  // register a beat before the story's own, and a one-shot on the first arrival would open nothing.
  const [opened, setOpened] = useState(false);
  useAsyncEffect(async () => {
    if (!opened && !busy.current && templates.some(({ id }) => id === templateId)) {
      setOpened(true);
      await handleSelect(templateId);
    }
  }, [opened, templates, templateId, handleSelect]);

  return (
    <>
      <Select.Root value={templateId} onValueChange={(id) => void handleSelect(id)}>
        <Select.TriggerButton placeholder='Template' />
        <Select.Portal>
          <Select.Content>
            <Select.Viewport>
              {sorted.map(({ id, label }) => (
                <Select.Option key={id} value={id}>
                  {label}
                </Select.Option>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      {/* Grows to fill, so the destructive action sits at the far end of the toolbar. */}
      <Toolbar.Separator variant='gap' />
      <Toolbar.IconButton icon='ph--trash--regular' label='Reset' onClick={() => void handleReset()} />
    </>
  );
};

/** The space a template opened before, identified by the name the story creates it with. */
const findTemplateSpace = (client: Client, label: string): Space | undefined =>
  client.spaces.get().find((space) => space.properties.name === label);
