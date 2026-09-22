//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Model } from '@dxos/ai';
import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Project from '@dxos/compute/Project';
import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { type Client, useClient } from '@dxos/react-client';
import { type Space, SpaceState } from '@dxos/react-client/echo';
import { Field, Select, Toolbar, useAsyncEffect } from '@dxos/react-ui';

import { isPersistent, setPersistent } from '../testing/persistence.ts';
import { VOYAGE_SPACE_ID } from '../testing/voyage-space.ts';
import { exportProfileArchive, pickProfileArchive, stageProfileImport } from './profile-archive.ts';

/**
 * Story chrome: a picker over the contributed space templates
 * ({@link AppCapabilities.SpaceTemplate}) above the story's grid, plus a reset.
 *
 * Space templates rather than project templates, because a project only means something with the
 * data it works over: the template brings the mailbox, the accounts and the documents into the
 * space alongside the project, so every column has something real to show.
 *
 * Each template gets its own space, named after it. Picking one opens that space when it exists and
 * creates it otherwise, so the story keeps every template's work side by side on a persistent
 * client instead of one template's content overwriting the last. Reset wipes the profile and
 * reloads, which is the way back to an empty client.
 *
 * The profile buttons move that persistent client's data in and out as a `.dxprofile`, and the
 * checkbox decides whether the next boot is persistent at all (see `persistence.ts`).
 */
export const SpaceTemplateToolbar = () => (
  <Toolbar.Root>
    <TemplateSelect />
    <Toolbar.Separator variant='gap' />
    <ProfileControls />
  </Toolbar.Root>
);

const TemplateSelect = () => {
  const client = useClient();
  const templates = useCapabilities(AppCapabilities.SpaceTemplate);
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
    async (space: Space, templateId: string) => {
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
      // Set before the first turn so the run starts on the model the template is written for, rather
      // than whatever the picker last defaulted to.
      const model = TEMPLATE_MODELS[templateId];
      if (model) {
        Obj.update(chat, (chat) => {
          chat.model = Ref.fromURI(model.id);
        });
      }
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
        await bindChat(space, template.id);
      } finally {
        busy.current = false;
      }
    },
    [client, templates, invokePromise, showSpace, bindChat],
  );

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
    </>
  );
};

/**
 * Profile round trip and the persistence switch, with reset at the far end since it is the
 * destructive one. Export and import only mean something against a persistent client — an
 * ephemeral one holds nothing in OPFS — so they are disabled otherwise.
 */
const ProfileControls = () => {
  const client = useClient();
  const persistent = isPersistent();

  const handleExport = useCallback(async () => {
    try {
      await exportProfileArchive(client, 'stories-assistant');
    } catch (error) {
      log.catch(error);
    }
  }, [client]);

  /** Staged and applied on reload, before the client starts: the running worker holds the pool open. */
  const handleImport = useCallback(async () => {
    const bytes = await pickProfileArchive();
    if (!bytes) {
      return;
    }
    try {
      await stageProfileImport(bytes);
    } catch (error) {
      log.catch(error);
      return;
    }
    window.location.reload();
  }, []);

  /** Takes effect on reload: the client has already booted with the previous choice. */
  const handlePersistentChange = useCallback((checked: boolean | 'indeterminate') => {
    if (setPersistent(checked === true)) {
      window.location.reload();
    }
  }, []);

  /** Wipes the profile and reloads, the way the other stories reset a persistent client. */
  const handleReset = useCallback(async () => {
    await client.reset();
    window.location.reload();
  }, [client]);

  return (
    <>
      <Toolbar.IconButton
        icon='ph--download-simple--regular'
        iconOnly
        label='Export profile (.dxprofile)'
        disabled={!persistent}
        onClick={() => void handleExport()}
      />
      <Toolbar.IconButton
        icon='ph--upload-simple--regular'
        iconOnly
        label='Import profile (.dxprofile)'
        disabled={!persistent}
        onClick={() => void handleImport()}
      />
      <Field.Checkbox checked={persistent} onCheckedChange={handlePersistentChange}>
        Persistent
      </Field.Checkbox>
      <Toolbar.IconButton icon='ph--trash--regular' label='Reset' onClick={() => void handleReset()} />
    </>
  );
};

/**
 * The model each template's chat starts on. The agent-run templates are written for DeepSeek V4 Pro
 * through the edge, which needs no key; a template not listed keeps the picker's default.
 */
const TEMPLATE_MODELS: Record<string, Model.Model> = {
  'org.dxos.plugin-debug.template.stockfish': Model.deepseekV4Pro,
  'org.dxos.plugin-debug.template.weather': Model.deepseekV4Pro,
};

/**
 * The space a template opened before, identified by the name the story creates it with. Only ready
 * spaces are considered: `properties` throws on one that is not, and a boot that brings several up at
 * once — an imported profile, say — would otherwise reject here before any of them has settled.
 */
const findTemplateSpace = (client: Client, label: string): Space | undefined =>
  client.spaces.get().find((space) => space.state.get() === SpaceState.SPACE_READY && space.properties.name === label);
