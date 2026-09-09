//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useMemo, useRef, useState } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import * as Project from '@dxos/compute/Project';
import { Filter } from '@dxos/echo';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { Select, Toolbar, useAsyncEffect } from '@dxos/react-ui';

import { VOYAGE_SPACE_ID } from '../testing/voyage-space';

/**
 * Story chrome: a picker over the contributed space templates
 * ({@link SpaceCapabilities.SpaceTemplate}) above the story's grid.
 *
 * Space templates rather than project templates, because a project only means something with the
 * data it works over: the template brings the mailbox, the accounts and the documents into the
 * space alongside the project, so every column has something real to show.
 *
 * Selecting one resets the space to that template: every object is deleted, the template's `apply`
 * writes its content, and a fresh chat is bound to whatever project it created with
 * `AssistantOperation.BindChatContext` — the binding the app makes when a chat opens on a project.
 */
export const SpaceTemplateToolbar = ({ children }: PropsWithChildren) => {
  const space = useActiveSpace();

  return (
    <div className='dx-grow grid grid-rows-[min-content_1fr]'>
      <Toolbar.Root>{space && <TemplateSelect space={space} />}</Toolbar.Root>
      {/* The grid pins itself to its nearest positioned ancestor. */}
      <div className='relative'>{children}</div>
    </div>
  );
};

const TemplateSelect = ({ space }: { space: Space }) => {
  const client = useClient();
  const templates = useCapabilities(SpaceCapabilities.SpaceTemplate);
  const { invokePromise } = useOperationInvoker();
  const [templateId, setTemplateId] = useState(VOYAGE_SPACE_ID);
  // Guards the seed effect against the re-renders between a reset starting and its content landing.
  const busy = useRef(false);

  const sorted = useMemo(
    () => [...templates].sort((left, right) => left.label.localeCompare(right.label)),
    [templates],
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
        // Templates write into a clean space; applying one over another's content would stack two
        // projects and two mailboxes in the columns.
        const objects = await space.db.query(Filter.everything()).run();
        for (const object of objects) {
          space.db.remove(object);
        }
        await space.db.flush();

        await template.apply({ client, space });
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
      } finally {
        busy.current = false;
      }
    },
    [client, space, templates, invokePromise],
  );

  // Seed the default template, so the story opens on a bound conversation rather than an empty space.
  const [seeded, setSeeded] = useState(false);
  useAsyncEffect(async () => {
    if (!seeded && !busy.current && sorted.length > 0) {
      setSeeded(true);
      await handleSelect(templateId);
    }
  }, [seeded, sorted, templateId, handleSelect]);

  return (
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
  );
};
