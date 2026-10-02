//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import * as Project from '@dxos/compute/Project';
import { type Database, Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { log } from '@dxos/log';
import * as FileOperation from '@dxos/plugin-file/FileOperation';
import * as ObservabilityCapabilities from '@dxos/plugin-observability/ObservabilityCapabilities';
import * as TaskOperation from '@dxos/plugin-tasks/TaskOperation';
import { Task } from '@dxos/types';
import { osTranslations } from '@dxos/ui-theme';

import { FeedbackForm, type FeedbackProjectOption, type FeedbackReportToProjectHandler } from '#components';
import { meta } from '#meta';
import { type SupportOperation } from '#types';

import { captureScreenshot } from './screenshot.ts';

const PRIORITY: Record<SupportOperation.Severity, Task.Priority> = {
  'High priority': 'high',
  'Medium priority': 'medium',
  'Low priority': 'low',
};

/** The report's metadata, appended to its body so the task carries what the support route sends as fields. */
const taskDescription = (values: SupportOperation.SupportRequest): string => {
  const details = [
    values.type && `- Type: ${values.type}`,
    values.severity && `- Severity: ${values.severity}`,
    values.area && `- Area: ${values.area}`,
    values.version && `- Version: ${values.version}`,
  ].filter(Boolean);
  return details.length > 0 ? `${values.body}\n\n${details.join('\n')}` : values.body;
};

const timestamp = () => new Date().toISOString().slice(0, 19).replace(/:/g, '-');

/**
 * Whether some plugin handles `FileOperation.Create`; without one the report is still filed, just
 * without its attachments.
 */
const useCanCreateFiles = (): boolean => {
  const handlerSets = useCapabilities(Capabilities.OperationHandler);
  return useMemo(
    () =>
      handlerSets.some((set) =>
        set.definitions().some((definition) => definition.meta.key === FileOperation.Create.meta.key),
      ),
    [handlerSets],
  );
};

/** Projects in the active space that own a task set, i.e. those a report can be filed in. */
const useReportableProjects = (db: Database.Database | undefined): Project.Project[] => {
  const projects = useQuery(db, Filter.type(Project.Project));
  return useMemo(() => projects.filter((project) => project.taskSet !== undefined), [projects]);
};

/**
 * Files the report as a task in a local project, attaching the debug logs and a screenshot as files
 * owned by the task. Unlike the support route nothing leaves the space, so the screenshot is stored
 * rather than uploaded to the public image service.
 */
const useReportToProject = (
  db: Database.Database | undefined,
  projects: readonly Project.Project[],
): FeedbackReportToProjectHandler => {
  const { invokePromise } = useOperationInvoker();
  const [exportLogs] = useCapabilities(ObservabilityCapabilities.LogExporter);
  const canCreateFiles = useCanCreateFiles();

  return useCallback(
    async (projectId, values) => {
      const namespace = { ns: meta.profile.key };
      const showToast = (id: string, icon: string, title: string, description: string) =>
        invokePromise(LayoutOperation.AddToast, {
          id: `${meta.profile.key}.${id}`,
          icon,
          duration: 5000,
          title: [title, namespace],
          description: [description, namespace],
          closeLabel: ['close.label', { ns: osTranslations }],
        });

      const project = projects.find((project) => project.id === projectId);
      if (!db || !project?.taskSet) {
        return false;
      }

      const { data, error } = await invokePromise(
        TaskOperation.CreateTask,
        {
          taskSet: project.taskSet,
          title: values.title,
          description: taskDescription(values),
          priority: values.severity && PRIORITY[values.severity],
        },
        { spaceId: db.spaceId },
      );
      if (error || !data) {
        log.error('report not filed in project', { error });
        await showToast(
          'project-report-failed',
          'ph--warning--regular',
          'project-report-failed-toast.label',
          'project-report-failed-toast.description',
        );
        return false;
      }

      const files = canCreateFiles ? await collectAttachments(values, exportLogs) : [];
      const [task] = db.query(Filter.and(Filter.type(Task.Task), Filter.id(data.task.id))).runSync();
      let attached = 0;
      if (task) {
        for (const file of files) {
          if (await attachFile(invokePromise, db, task, file)) {
            attached++;
          }
        }
      }

      const incomplete = attached < files.length || (!canCreateFiles && wantsAttachments(values));
      await showToast(
        'project-report-success',
        'ph--kanban--regular',
        'project-report-toast.label',
        incomplete ? 'project-report-toast-partial.description' : 'project-report-toast.description',
      );
      return true;
    },
    [invokePromise, db, projects, exportLogs, canCreateFiles],
  );
};

const wantsAttachments = (values: SupportOperation.SupportRequest): boolean =>
  !!values.image || values.includeLogs !== false;

/** The files the user opted into; each is best-effort, so a failed capture drops only that file. */
const collectAttachments = async (
  values: SupportOperation.SupportRequest,
  exportLogs: ObservabilityCapabilities.LogExporter | undefined,
): Promise<globalThis.File[]> => {
  const files: globalThis.File[] = [];
  if (values.image) {
    const screenshot = await captureScreenshot();
    if (screenshot) {
      files.push(new File([screenshot], `screenshot-${timestamp()}.jpg`, { type: screenshot.type }));
    }
  }
  if (values.includeLogs !== false && exportLogs) {
    try {
      const logs = await exportLogs();
      files.push(new File([logs], `composer-logs-${timestamp()}.ndjson.gz`, { type: logs.type }));
    } catch (err) {
      log.warn('report logs export failed', { err });
    }
  }
  return files;
};

/** Stores a browser file and attaches it to the task, removing the stored file if the attach fails. */
const attachFile = async (
  invokePromise: ReturnType<typeof useOperationInvoker>['invokePromise'],
  db: Database.Database,
  task: Task.Task,
  file: globalThis.File,
): Promise<boolean> => {
  const { data, error } = await invokePromise(FileOperation.Create, { db, file });
  if (error || !data) {
    log.warn('report attachment rejected', { name: file.name, error });
    return false;
  }

  const object = db.add(data.object);
  const { error: attachError } = await invokePromise(
    TaskOperation.AddAttachment,
    { task: Ref.make(task), file: Ref.make(object) },
    { spaceId: db.spaceId },
  );
  if (attachError) {
    if (!(task.attachments ?? []).some((ref) => Task.refEntityId(ref) === object.id)) {
      db.remove(object);
    }
    log.warn('report attachment failed', { name: file.name, error: attachError });
    return false;
  }
  return true;
};

/** Renders the project picker and "Report to project" button for the active space's projects. */
export const ReportToProjectAction = () => {
  const space = useActiveSpace();
  const db = space?.db;
  const projects = useReportableProjects(db);
  const handleReport = useReportToProject(db, projects);
  const options = useMemo<FeedbackProjectOption[]>(
    () => projects.map((project) => ({ id: project.id, name: Obj.getLabel(project) ?? project.id })),
    [projects],
  );

  return <FeedbackForm.ReportToProject projects={options} onReport={handleReport} />;
};

ReportToProjectAction.displayName = 'ReportToProjectAction';
