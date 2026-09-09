//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Surface, useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import * as Chat from '@dxos/assistant/Chat';
import * as Project from '@dxos/compute/Project';
import { Filter, type Obj } from '@dxos/echo';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import * as ProjectOperation from '@dxos/plugin-projects/ProjectOperation';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Panel, Select, Toolbar } from '@dxos/react-ui';
import { useAsyncEffect } from '@dxos/react-ui';
import { Loading } from '@dxos/react-ui/testing';

import { VOYAGE_TEMPLATE_ID } from '../testing/voyage-template';

export const ProjectModule = () => {
  const space = useActiveSpace();
  if (!space) {
    return <Loading data={{ space: !!space }} />;
  }

  return <ProjectModuleContainer space={space} />;
};

/**
 * The project column: a picker over the contributed project templates
 * ({@link ProjectCapabilities.Template}) above the selected project's real article surface.
 *
 * Selecting a template resets the space to that project: the current project and its chats are
 * deleted, `ProjectOperation.Create` scaffolds the chosen template against the story's mailbox, and
 * a fresh chat is bound to the new project with `AssistantOperation.BindChatContext` — the same
 * operations the app runs, so what the story shows is the real create-and-bind path.
 */
const ProjectModuleContainer = ({ space }: { space: Space }) => {
  const templates = useCapabilities(ProjectCapabilities.Template);
  const [mailbox] = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const projects = useQuery(space.db, Filter.type(Project.Project));
  const chats = useQuery(space.db, Filter.type(Chat.Chat));
  const { invokePromise } = useOperationInvoker();
  const [templateId, setTemplateId] = useState(VOYAGE_TEMPLATE_ID);
  const [error, setError] = useState<string>();
  // Guards the seed effect against the re-renders between a reset starting and its project landing.
  const busy = useRef(false);

  const project = projects.at(-1);

  // The mailbox is the subject: templates that need one (inbox research, CRM) gate on it, and the
  // subject-free ones apply regardless.
  const applicable = useMemo(
    () =>
      [...templates]
        .filter((template) => template.appliesTo?.(mailbox) ?? true)
        .sort((left, right) => left.label.localeCompare(right.label)),
    [templates, mailbox],
  );

  const handleSelect = useCallback(
    async (id: string) => {
      if (busy.current) {
        return;
      }
      busy.current = true;
      setTemplateId(id);
      setError(undefined);
      try {
        // Reset: the story shows one project and its conversation, so the previous pair goes.
        for (const object of [...projects, ...chats]) {
          space.db.remove(object as Obj.Unknown);
        }
        const created = await invokePromise(
          ProjectOperation.Create,
          { templateId: id, subject: mailbox },
          { spaceId: space.id },
        );
        if (created.error || !created.data) {
          throw created.error ?? new Error(`Template scaffolded nothing: ${id}`);
        }
        const { project } = created.data;

        const chatResult = await invokePromise(AssistantOperation.CreateChat, {}, { spaceId: space.id });
        if (chatResult.error || !chatResult.data) {
          throw chatResult.error ?? new Error('Chat was not created.');
        }
        // The operation returns the chat unfiled, for the caller to persist.
        const chat = space.db.add(chatResult.data.object);
        await invokePromise(AssistantOperation.BindChatContext, { chat, subject: project }, { spaceId: space.id });
      } catch (cause) {
        setError(String(cause));
      } finally {
        busy.current = false;
      }
    },
    [space, projects, chats, mailbox, invokePromise],
  );

  // Seed the default project, so the story opens on a bound conversation rather than an empty shell.
  useAsyncEffect(async () => {
    if (!project && !busy.current && applicable.length > 0) {
      await handleSelect(templateId);
    }
  }, [project, applicable, templateId, handleSelect]);

  return (
    <Panel.Root>
      <Panel.Toolbar>
        <Toolbar.Root>
          <Select.Root value={templateId} onValueChange={(id) => void handleSelect(id)}>
            <Select.TriggerButton placeholder='Template' />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {applicable.map(({ id, label }) => (
                    <Select.Option key={id} value={id}>
                      {label}
                    </Select.Option>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </Toolbar.Root>
      </Panel.Toolbar>
      {error ? (
        <Panel.Content>
          <div role='alert'>{error}</div>
        </Panel.Content>
      ) : project ? (
        <Surface.Surface type={AppSurface.Article} data={{ subject: project, attendableId: project.id }} limit={1} />
      ) : (
        <Loading data={{ project: !!project }} />
      )}
    </Panel.Root>
  );
};
