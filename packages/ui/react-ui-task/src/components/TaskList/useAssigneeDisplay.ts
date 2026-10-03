//
// Copyright 2026 DXOS.org
//

import { useObject } from '@dxos/echo-react';
import { useTranslation } from '@dxos/react-ui';
import { type Actor } from '@dxos/types';

import { translationKey } from '#translations';

import { type AssigneeDisplay, PERSON_ICON, getAssigneeDisplay } from './assignee.ts';

/**
 * The label and glyph for a task's assignee, resolving its contact and subject refs — shared by the
 * list's pill and the properties row so the two cannot name the same assignee differently.
 */
export const useAssigneeDisplay = (assignee?: Actor.Actor): AssigneeDisplay => {
  const { t } = useTranslation(translationKey);
  const [contact] = useObject(assignee?.contact);
  const [subject] = useObject(assignee?.subject);
  if (!assignee) {
    return { icon: PERSON_ICON, agent: false };
  }

  return getAssigneeDisplay({ assignee, contact, subject, agentLabel: t('assignee-agent.label') });
};
