//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import { useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Annotation, Obj } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui';
import { type MenuItem, createMenuAction } from '@dxos/react-ui-menu';
import { osTranslations } from '@dxos/ui-theme';

import { LayoutOperation } from '../../operations';

const OPEN_ICON = 'ph--arrow-square-out--regular';

/** True when subject is an Echo object and its schema does not have the system annotation. */
const canNavigateToSubject = (subject: unknown): subject is Obj.Unknown => {
  if (!subject || !Obj.isObject(subject)) {
    return false;
  }

  const schema = Obj.getSchema(subject);
  return !(schema != null && Option.getOrElse(Annotation.SystemTypeAnnotation.get(schema), () => false));
};

/**
 * Returns an onClick handler that opens the subject in the layout, or undefined if the subject is not navigable
 * (e.g. not an Echo object or has system annotation). Use with Card.Title for object cards.
 */
export const useObjectNavigate = (subject: unknown): (() => void) | undefined => {
  const { invokePromise } = useOperationInvoker();

  return useMemo(() => {
    if (!canNavigateToSubject(subject)) {
      return;
    }

    const subjectId = Obj.getDXN(subject).toString();
    return () => {
      void invokePromise(LayoutOperation.Open, { subject: [subjectId] });
    };
  }, [subject, invokePromise]);
};

/**
 * Returns object-scoped menu items (e.g. Open/Navigate) for the given subject.
 * Only includes items when subject is an Echo object and its schema does not have the system annotation.
 * Use with useMenuContributions(CONTRIBUTOR_NAME)?.addContribution from a component inside Card.Root to register with the card menu.
 */
export const useObjectMenuItems = (subject: unknown): MenuItem[] => {
  const { invokePromise } = useOperationInvoker();
  const { t } = useTranslation(osTranslations);

  return useMemo(() => {
    if (!canNavigateToSubject(subject)) {
      return [];
    }

    const subjectId = Obj.getDXN(subject).toString();
    return [
      createMenuAction(
        'navigate',
        () => {
          void invokePromise(LayoutOperation.Open, { subject: [subjectId] });
        },
        {
          label: t('open label'),
          icon: OPEN_ICON,
        },
      ),
    ];
  }, [subject, invokePromise, t]);
};

/** Contribution id for object-actions (Open/Navigate). Use with useMenuContributions(CONTRIBUTOR_NAME)?.addContribution. */
export const OBJECT_ACTIONS_CONTRIBUTION_ID = 'object-actions';

/**
 * Priority for object-actions contribution.
 */
export const OBJECT_ACTIONS_CONTRIBUTION_PRIORITY = 50;
