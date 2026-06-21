//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Routine } from '@dxos/compute';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { AutomationForm } from '#components';
import { meta } from '#meta';
import { Automation, AutomationOperation } from '#types';

export type AutomationArticleProps = AppSurface.ObjectArticleProps<Automation.Automation>;

/** Article surface for an {@link Automation}: a panel wrapping the composite {@link AutomationForm}. */
export const AutomationArticle = ({ role, attendableId, subject }: AutomationArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  // Subscribe so the Run action's enabled state tracks the action (runnable or owned routine) being set or cleared.
  const [automation] = useObject(subject);
  const [running, setRunning] = useState(false);
  const db = Obj.getDatabase(subject);
  // A routine action stores no `runnable`; it is a Routine parented to the automation, so query for one.
  const routines = useQuery(db, Filter.type(Routine.Routine));
  const canRun = useMemo(
    () => Boolean(automation.runnable) || routines.some((routine) => Obj.getParent(routine)?.id === subject.id),
    [automation.runnable, routines, subject.id],
  );

  const handleRun = useCallback(() => {
    if (!invokePromise || !db) {
      return;
    }
    setRunning(true);
    void invokePromise(
      AutomationOperation.RunAutomation,
      { automation: Ref.make(subject) },
      {
        spaceId: db.spaceId,
        notify: { error: ['run-error.message', { ns: meta.profile.key }] },
      },
    ).finally(() => setRunning(false));
  }, [invokePromise, db, subject]);

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'run',
          {
            label: ['run.label', { ns: meta.profile.key }],
            icon: 'ph--play--regular',
            disabled: running || !canRun,
            disposition: 'toolbar',
            testId: 'automation.toolbar.run',
          },
          () => handleRun(),
        )
        .build(),
    [running, canRun, handleRun],
  );

  if (!db) {
    return null;
  }

  return (
    <Menu.Root {...menuActions} attendableId={attendableId}>
      <Panel.Root role={role}>
        <Panel.Toolbar classNames='bg-toolbar-surface'>
          <Menu.Toolbar className='dx-document' />
        </Panel.Toolbar>
        <Panel.Content classNames='dx-document'>
          <AutomationForm db={db} automation={subject} />
        </Panel.Content>
      </Panel.Root>
    </Menu.Root>
  );
};
