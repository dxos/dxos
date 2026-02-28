//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import { useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Annotation, Obj } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui';
import { type MenuItem, createMenuAction, useMenuContribution } from '@dxos/react-ui-menu';
import { osTranslations } from '@dxos/ui-theme';

import { LayoutOperation } from '../../operations';

const OBJECT_ACTIONS_CONTRIBUTION_ID = 'object-actions';
const NAVIGATE_PRIORITY = 50;
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
 * Call from a component that is rendered inside Card.Root (e.g. inside Card.Content) so that
 * useMenuContribution in the same tree registers with the card's MenuProvider.
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

/**
 * Contributes object-scoped menu items to the nearest Card menu (e.g. Open/Navigate).
 * Must be called from a component rendered inside Card.Root (e.g. inside Card.Content) so the
 * contribution registers with that card's MenuProvider. For card layouts where the surface-providing
 * component is outside Card.Root (e.g. KanbanCard), use a small wrapper inside Card.Content that
 * calls this hook and renders the surface.
 */
export const useObjectMenuContributions = (subject: unknown): void => {
  const items = useObjectMenuItems(subject);

  useMenuContribution({
    id: OBJECT_ACTIONS_CONTRIBUTION_ID,
    mode: 'additive',
    priority: NAVIGATE_PRIORITY,
    items,
  });
};
