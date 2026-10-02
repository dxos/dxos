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
import { type File as FileType } from '@dxos/types';
import { osTranslations } from '@dxos/ui-theme';

import { FeedbackForm, type FeedbackProjectOption, type FeedbackReportToProjectHandler } from '#components';
import { meta } from '#meta';
import { SupportOperation } from '#types';

import { captureScreenshot } from './screenshot.ts';

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
 * Gathers the screenshot and debug logs, which only the browser can produce, stores them and hands
 * them to {@link SupportOperation.SubmitToProject}. Unlike the support route nothing leaves the
 * space, so the screenshot is stored rather than uploaded to the public image service.
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

      // Stored before the task exists so the operation can take ownership of them in one write.
      const files = canCreateFiles ? await collectAttachments(values, exportLogs) : [];
      const stored = (await Promise.all(files.map((file) => storeFile(invokePromise, db, file)))).filter(
        (object) => object !== undefined,
      );

      const { error } = await invokePromise(
        SupportOperation.SubmitToProject,
        { project: Ref.make(project), report: values, attachments: stored.map((object) => Ref.make(object)) },
        { spaceId: db.spaceId },
      );
      if (error) {
        log.error('report not filed in project', { error });
        // Nothing owns the stored files once the task was not created.
        for (const object of stored) {
          db.remove(object);
        }
        await showToast(
          'project-report-failed',
          'ph--warning--regular',
          'project-report-failed-toast.label',
          'project-report-failed-toast.description',
        );
        return false;
      }

      const incomplete = stored.length < files.length || (!canCreateFiles && wantsAttachments(values));
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

/** Stores a browser file as a `File` object; undefined when the file plugin rejects it. */
const storeFile = async (
  invokePromise: ReturnType<typeof useOperationInvoker>['invokePromise'],
  db: Database.Database,
  file: globalThis.File,
): Promise<FileType.File | undefined> => {
  const { data, error } = await invokePromise(FileOperation.Create, { db, file });
  if (error || !data) {
    log.warn('report attachment rejected', { name: file.name, error });
    return undefined;
  }
  return db.add(data.object);
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
