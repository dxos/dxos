//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Panel, Toolbar } from '@dxos/react-ui';

import { AutomationForm } from '#components';
import { Automation } from '#types';

export type AutomationArticleProps = AppSurface.ObjectArticleProps<Automation.Automation>;

/** Article surface for an {@link Automation}: a panel wrapping the composite {@link AutomationForm}. */
export const AutomationArticle = ({ subject }: AutomationArticleProps) => {
  const db = Obj.getDatabase(subject);
  if (!db) {
    return null;
  }

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root />
      </Panel.Toolbar>
      <Panel.Content classNames='dx-document'>
        <AutomationForm db={db} automation={subject} />
      </Panel.Content>
    </Panel.Root>
  );
};
