//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { Filter, Obj, Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { useQuery, type Space } from '@dxos/react-client/echo';
import { DropdownMenu, Icon, Tooltip, useTranslation } from '@dxos/react-ui';
import { Accordion } from '@dxos/react-ui-list';

import { meta } from '#meta';
import { Automation, AutomationCapabilities, AutomationOperation } from '#types';

import { AutomationInlineForm } from '../../containers/AutomationArticle/AutomationArticle';
import { getAutomationsPath } from '../../paths';
import { connectedAutomationsQuery } from '../../util/automations-for-object';

export type AutomationsCompanionProps = {
  space: Space;
  object: Obj.Unknown;
};

/** Association state of a row relative to the companion's object. */
type Status = 'associated' | 'pending' | 'detached';

/**
 * Lists the automations connected to an object via a reactive reverse-reference query
 * (see `connectedAutomationsQuery`). The list is **session-stable**: rows are appended as they connect or
 * are created here and are never removed while mounted — instead a row that loses its association (or a
 * freshly-created one that has none yet) is flagged with a warning badge. This keeps inline editing from
 * making rows jump or disappear. Creating uses a template dropdown (no dialog); the new automation is
 * appended and auto-expanded for immediate configuration.
 */
export const AutomationsCompanion = ({ space, object }: AutomationsCompanionProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const templates = useCapabilities(AutomationCapabilities.Template);

  // Live connected set (reactive reverse-ref query) + a by-id map for resolving rows that have left it.
  const connected = useQuery(space.db, connectedAutomationsQuery(object));
  const all = useQuery(space.db, Filter.type(Automation.Automation));
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
    () => seenOrder.current.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])),
    [byId, connectedIds, createdIds],
  );

  const statusFor = useCallback(
    (id: string): Status =>
      connectedIds.has(id) ? 'associated' : everConnected.current.has(id) ? 'detached' : 'pending',
    [connectedIds],
  );

  const handleCreate = useCallback(
    async (templateId: string) => {
      const { data, error } = await invokePromise(AutomationOperation.CreateAutomationFromTemplate, {
        db: space.db,
        templateId,
        subject: object,
      });
      if (error || !data) {
        return;
      }

      const created = data.object;
      const { error: addError } = await invokePromise(SpaceOperation.AddObject, {
        object: created,
        target: space.db,
        // Automations are not first-class items in the space tree; land under the "Automations" section.
        hidden: true,
        targetNodeId: getAutomationsPath(space.db.spaceId),
      });
      if (addError) {
        return;
      }

      setCreatedIds((prev) => new Set(prev).add(created.id));
      setOpen((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]));
    },
    [invokePromise, space.db, object],
  );

  return (
    <div className='flex flex-col'>
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
                    <Accordion.ItemHeader>
                      <Icon icon='ph--lightning--regular' size={4} classNames='mr-2 shrink-0' />
                      <span className='flex-1 truncate'>
                        {Obj.getLabel(automation) ??
                          t('object-name.placeholder', { ns: Type.getTypename(Automation.Automation) })}
                      </span>
                      {status !== 'associated' && (
                        <Tooltip.Trigger
                          asChild
                          side='bottom'
                          content={t(
                            status === 'pending' ? 'automation-not-associated.message' : 'automation-detached.message',
                          )}
                        >
                          <Icon icon='ph--warning--regular' size={4} classNames='text-warning-text shrink-0 mr-2' />
                        </Tooltip.Trigger>
                      )}
                    </Accordion.ItemHeader>
                    <Accordion.ItemBody>
                      <AutomationInlineForm automation={automation} space={space} />
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
            <button className='group flex items-center p-2 dx-focus-ring-inset w-full text-start'>
              <Icon icon='ph--plus--regular' size={4} classNames='mr-2 shrink-0' />
              <span className='flex-1 truncate'>
                {t('add-object.label', { ns: Type.getTypename(Automation.Automation) })}
              </span>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content>
              <DropdownMenu.Viewport>
                {templates.map((template) => (
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
    </div>
  );
};
