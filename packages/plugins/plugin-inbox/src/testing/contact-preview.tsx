//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useCallback } from 'react';

import { type Database, Filter } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { buildContactFromActor } from '@dxos/extractor-lib';
import { EID } from '@dxos/keys';
import { Card, Icon, Popover } from '@dxos/react-ui';
import { EditorPreviewProvider, useEditorPreview } from '@dxos/react-ui-editor';
import { type Actor, type Person } from '@dxos/types';
import { type PreviewLinkRef, type PreviewLinkTarget } from '@dxos/ui-types';

/**
 * The popover content a contact hover resolves to: whoever `Row.Person`'s avatar/anchor asked for.
 */
const ContactPreviewCard = () => {
  const { target } = useEditorPreview('ContactPreviewCard');
  const contact: Person.Person | undefined = target?.object;
  if (!target) {
    return null;
  }

  return (
    <Popover.Portal>
      <Popover.Content onOpenAutoFocus={(event) => event.preventDefault()}>
        <Popover.Viewport classNames='dx-card-popover-width'>
          <Card.Root border={false} data-testid='contact-preview'>
            <Card.Header>
              <Card.Block>
                <Icon icon='ph--user--regular' />
              </Card.Block>
              <Card.Title>{contact?.fullName ?? target.label}</Card.Title>
            </Card.Header>
            <Card.Row>
              <Card.Text variant='description'>{contact?.emails?.[0]?.value}</Card.Text>
            </Card.Row>
          </Card.Root>
        </Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Portal>
  );
};

/**
 * Hosts the contact card that `Row.Person` asks for when an avatar (or contact anchor) is hovered.
 *
 * Any surface rendering `Row.Person` needs one: the row only DISPATCHES `DxAnchorActivate`, and in
 * Composer PreviewPlugin answers it (listening on `window`, dispatching a layout operation). Outside
 * the app nothing does, so a story without this appears to ignore the hover entirely. Shared so every
 * story that shows people gets the same behaviour rather than re-deriving it.
 */
export const ContactPreview = ({ db, children }: PropsWithChildren<{ db?: Database.Database }>) => {
  // Resolves the hovered row's DXN back to its Person, so the card shows the real contact.
  const handleLookup = useCallback(
    async ({ dxn, label }: PreviewLinkRef): Promise<PreviewLinkTarget> => {
      const eid = EID.tryParse(dxn);
      const id = eid && EID.getEntityId(eid);
      const object = id && db ? (await db.query(Filter.id(id)).run())[0] : undefined;
      return { label, object };
    },
    [db],
  );

  return (
    <EditorPreviewProvider onLookup={handleLookup}>
      <ContactPreviewCard />
      {children}
    </EditorPreviewProvider>
  );
};

/**
 * Creates the contact for an actor with the extractor's own `buildContactFromActor` — the same core
 * the app reaches through `InboxOperation.ExtractContact`, so a story's create affordance flips the row
 * into its card-on-hover state exactly as the app does.
 */
export const useContactCreate = (db?: Database.Database) =>
  useCallback(
    (actor: Actor.Actor) => {
      if (!db) {
        return;
      }
      void EffectEx.runPromise(buildContactFromActor(actor, db)).then((contact) => {
        if (contact) {
          db.add(contact);
        }
      });
    },
    [db],
  );
