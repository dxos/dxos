//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { type Database, Filter, Obj, Type } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { DropdownMenu, Icon, Panel, Toolbar, Tooltip, useTranslation } from '@dxos/react-ui';
import { Accordion } from '@dxos/react-ui-list';

import { meta } from '#meta';
import { Automation, AutomationCapabilities, AutomationOperation } from '#types';

import { AutomationInlineForm } from '../../containers/AutomationArticle';
import { connectedAutomationsQuery } from '../../util/automations-for-object';

/** Association state of a row relative to the companion's object. */
type Status = 'associated' | 'pending' | 'detached';

// TODO(burdon): Use type.
export type AutomationCompanionProps = {
  db: Database.Database;
  object: Obj.Unknown;
};

/**
 * Renders the automations connected to an object as an accordion (see `useConnectedAutomations` for the
 * session-stable list it draws from), flagging non-associated rows with a warning badge. New automations are
 * created from a template dropdown (no dialog).
 */
export const AutomationCompanion = ({ db, object }: AutomationCompanionProps) => {
  const { t } = useTranslation(meta.id);
  const templates = useCapabilities(AutomationCapabilities.Template);
  // Only offer templates applicable to this companion's subject (e.g. a CRM template needs a Mailbox).
  const applicableTemplates = useMemo(
    () => templates.filter((template) => template.appliesTo?.(object) ?? true),
    [templates, object],
  );
  const { items, statusFor, open, setOpen, handleCreate } = useConnectedAutomations(db, object);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root />
      </Panel.Toolbar>
      <Panel.Content>
        {items.length === 0 ? (
          <p className='text-sm text-description p-2'>{t('no-automations.message')}</p>
        ) : (
          <Accordion.Root<Automation.Automation> items={items} value={open} onValueChange={setOpen}>
            {({ items }) => (
              <div className='flex flex-col divide-y divide-separator'>
                {items.map((automation) => {
                  const status = statusFor(automation.id);
                  return (
                    <Accordion.Item key={automation.id} item={automation}>
                      <Accordion.ItemHeader icon='ph--lightning--regular'>
                        <span className='flex-1 truncate'>
                          {Obj.getLabel(automation) ??
                            t('object-name.placeholder', { ns: Type.getTypename(Automation.Automation) })}
                        </span>
                        {status !== 'associated' && (
                          <Tooltip.Trigger
                            asChild
                            side='bottom'
                            content={t(
                              status === 'pending'
                                ? 'automation-not-associated.message'
                                : 'automation-detached.message',
                            )}
                          >
                            <Icon icon='ph--warning--regular' size={4} classNames='text-warning-text shrink-0 mr-2' />
                          </Tooltip.Trigger>
                        )}
                      </Accordion.ItemHeader>
                      <Accordion.ItemBody>
                        <AutomationInlineForm automation={automation} db={db} />
                      </Accordion.ItemBody>
                    </Accordion.Item>
                  );
                })}
              </div>
            )}
          </Accordion.Root>
        )}

        <div className='border-t border-separator'>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              {/* Mirror the accordion item header layout (p-2 + icon mr-2) so the icon aligns with the rows above. */}
              <button type='button' className='group flex items-center p-2 dx-focus-ring-inset w-full text-start'>
                <Icon icon='ph--plus--regular' size={4} classNames='mr-2 shrink-0' />
                <span className='flex-1 truncate'>
                  {t('add-object.label', { ns: Type.getTypename(Automation.Automation) })}
                </span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content>
                <DropdownMenu.Viewport>
                  {applicableTemplates.map((template) => (
                    <DropdownMenu.Item key={template.id} onClick={() => void handleCreate(template.id)}>
                      <Icon icon={template.icon ?? 'ph--lightning--regular'} size={4} />
                      <span>{template.label}</span>
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Viewport>
                <DropdownMenu.Arrow />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};

//
// Hooks
//

/**
 * Owns the companion's session-stable automation list. A reactive reverse-ref query supplies the live
 * connected set, accumulated into an append-only ordering so rows never reorder or disappear while mounted;
 * a row that loses its association (or a freshly-created one not yet connected) is surfaced via `statusFor`
 * rather than dropped. Also holds the accordion open state and a create handler that appends the new
 * automation and auto-expands it for immediate configuration.
 */
const useConnectedAutomations = (db: Database.Database, object: Obj.Unknown) => {
  const { invokePromise } = useOperationInvoker();

  // Live connected set (reactive reverse-ref query) + a by-id map for resolving rows that have left it.
  const connected = useQuery(db, connectedAutomationsQuery(object));
  const all = useQuery(db, Filter.type(Automation.Automation));
  const connectedIds = useMemo(() => new Set(connected.map((automation) => automation.id)), [connected]);
  const byId = useMemo(() => new Map(all.map((automation) => [automation.id, automation])), [all]);

  // Session-stable bookkeeping (held for the component lifetime).
  const seenOrder = useRef<string[]>([]);
  const everConnected = useRef<Set<string>>(new Set());
  const [createdIds, setCreatedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [open, setOpen] = useState<string[]>([]);

  // Accumulate first-seen order and "was ever connected" — append-only, so rows never reorder or drop.
  for (const id of connectedIds) {
    everConnected.current.add(id);
  }
  for (const id of [...connectedIds, ...createdIds]) {
    if (!seenOrder.current.includes(id)) {
      seenOrder.current.push(id);
    }
  }

  // Resolve to live objects in stable order, dropping ids whose object was hard-deleted.
  const items = useMemo(
    () =>
      seenOrder.current.flatMap((id) => {
        const automation = byId.get(id);
        return automation ? [automation] : [];
      }),
    [byId, connectedIds, createdIds],
  );

  const statusFor = useCallback(
    (id: string): Status =>
      connectedIds.has(id) ? 'associated' : everConnected.current.has(id) ? 'detached' : 'pending',
    [connectedIds],
  );

  const handleCreate = useCallback(
    async (templateId: string) => {
      const { data, error } = await invokePromise(AutomationOperation.CreateAutomation, {
        db,
        templateId,
        subject: object,
      });
      if (error || !data) {
        return;
      }

      setCreatedIds((prev) => new Set(prev).add(data.object.id));
      setOpen((prev) => (prev.includes(data.object.id) ? prev : [...prev, data.object.id]));
    },
    [invokePromise, db, object],
  );

  return { items, statusFor, open, setOpen, handleCreate };
};
