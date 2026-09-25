//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, CardIconSlot } from '@dxos/app-toolkit/ui';
import { type Database, Obj } from '@dxos/echo';
import { useObject, useResolveRef } from '@dxos/echo-react';
import { URI } from '@dxos/keys';
import { Card, Icon } from '@dxos/react-ui';
import { type ObjectLinkProps, type WidgetDef } from '@dxos/ui-editor';

export type ObjectCardProps = {
  /** The object's URI. */
  eid: string;
  /** What the header reads while the object has no label of its own. */
  label?: string;
  /** The database the URI is resolved against; the chat's, so space-relative URIs resolve. */
  db?: Database.Database;
};

/**
 * An object, named by URI, as its card: the header names it, the body is the object's `CardContent`
 * surface. Resolved through the host's database, so a reference the model wrote before the object
 * loaded still lands once it does.
 */
export const ObjectCard = ({ db, eid, label }: ObjectCardProps) => {
  const uri = useMemo(() => (eid ? URI.make(eid) : undefined), [eid]);
  const ref = useMemo(() => (uri && db ? db.makeRef<Obj.Unknown>(uri) : undefined), [uri, db]);
  const object = useResolveRef(ref);
  const [subject] = useObject(object);
  if (!subject) {
    return null;
  }

  const title = Obj.getLabel(subject)?.trim() || label || '';
  return (
    <Card.Root fullWidth>
      <Card.Header>
        <Card.Block>
          <CardIconSlot subject={subject}>
            <Icon icon={Obj.getIcon(subject)?.icon ?? 'ph--file--regular'} />
          </CardIconSlot>
        </Card.Block>
        <Card.Title classNames='line-clamp-1'>{title}</Card.Title>
      </Card.Header>
      <Surface.Surface type={AppSurface.CardContent} data={{ subject }} limit={1} />
    </Card.Root>
  );
};

ObjectCard.displayName = 'ObjectCard';

export type ObjectCardWidgetProps = ObjectLinkProps & Pick<ObjectCardProps, 'db'>;

/** An object embedded in a message (`![label](echo://…)`) as its card. */
export const ObjectCardWidget = ({ db, eid, label }: ObjectCardWidgetProps) => (
  <ObjectCard db={db} eid={eid} label={label} />
);

ObjectCardWidget.displayName = 'ObjectCardWidget';

/** The rough height of a card with a one-row body, so the row is measured near its size before the card resolves. */
const CARD_ESTIMATED_HEIGHT = 96;

/** The `objectImage` widget for a thread whose objects live in `db`. */
export const objectCardWidget = (db?: Database.Database): WidgetDef<ObjectLinkProps> => ({
  block: true,
  estimatedHeight: () => CARD_ESTIMATED_HEIGHT,
  heightMode: 'min',
  Component: (props) => <ObjectCardWidget {...props} db={db} />,
});
