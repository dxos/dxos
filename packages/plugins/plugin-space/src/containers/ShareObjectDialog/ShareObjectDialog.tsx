//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { generateName } from '@dxos/display-name';
import { Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import { toPublicKey } from '@dxos/protocols/buf';
import { useClient } from '@dxos/react-client';
import { type SpaceMember, SpaceMember_Role, useMembers } from '@dxos/react-client/echo';
import { Listbox } from '@dxos/react-ui-list';
import * as Avatar from '@dxos/react-ui/Avatar';
import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Select from '@dxos/react-ui/Select';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Typography from '@dxos/react-ui/Typography';
import { keyToFallback } from '@dxos/util';

import { meta } from '#meta';
import { SpaceOperation } from '#types';

import { collectShareScope } from '../../util/index.ts';
import { getPluginsForTypenames } from '../../util/share-plugins.ts';

export type ShareObjectDialogProps = {
  object: Obj.Unknown;
};

/**
 * Shares one object the way a document editor does: who already has access (the space's members), who else may open
 * it (only members, or anyone with the link), and a link to copy. The link is made on the first copy, since every
 * invitation writes a credential to the space's control feed.
 */
export const ShareObjectDialog = ({ object }: ShareObjectDialogProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const manager = PluginManagerProvider.usePluginManager();
  const client = useClient();
  const spaceId = Obj.getDatabase(object)?.spaceId;
  const members = useMembers(spaceId);
  const label = Obj.getLabel(object) ?? t('share-object-dialog.untitled.label');

  const [access, setAccess] = useState<SpaceOperation.ShareAccess>('anyone');
  const [role, setRole] = useState<SpaceOperation.ShareRole>('editor');
  // One link per access/role choice: a second copy reuses it rather than minting another invitation.
  const [links, setLinks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scope, setScope] = useState<Obj.Unknown[]>([]);
  const linkKey = access === 'anyone' ? `${access}:${role}` : access;
  const link = links[linkKey];

  // A one-shot read of what the link would carry, shown before anything is created.
  useEffect(() => {
    let cancelled = false;
    void EffectEx.runPromise(collectShareScope(object)).then((objects) => {
      if (!cancelled) {
        setScope(objects);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [object]);

  const pluginNames = useMemo(() => {
    const ids = getPluginsForTypenames(manager, scope.map((entry) => Obj.getTypename(entry) ?? '').filter(Boolean));
    return manager
      .getPlugins()
      .filter((plugin) => ids.includes(plugin.meta.profile.key))
      .map((plugin) => plugin.meta.profile.name ?? plugin.meta.profile.key);
  }, [manager, scope]);

  const self = toPublicKey(client.halo.identity.get()?.identityKey);
  const people = useMemo(
    () =>
      members
        .filter((member) => member.identity)
        .map((member) => toPerson(member, self && toPublicKey(member.identity?.identityKey)?.equals(self)))
        .sort((first, second) => Number(second.self) - Number(first.self)),
    [members, self],
  );

  const handleCopy = useCallback(async () => {
    setBusy(true);
    try {
      let url = link;
      if (!url) {
        const { data, error } = await invokePromise(SpaceOperation.ShareObject, { object, access, role });
        if (error || !data) {
          throw error ?? new Error('No link was made.');
        }
        url = data.url;
        setLinks((previous) => ({ ...previous, [linkKey]: data.url }));
      }
      // Shown in the field either way, so a refused clipboard write still leaves the link to copy by hand.
      await navigator.clipboard.writeText(url).then(
        () => setCopied(true),
        (error) => log.info('clipboard write refused', { error }),
      );
    } catch (error) {
      log.catch(error);
      await invokePromise(LayoutOperation.AddToast, {
        id: `${meta.profile.key}/share-object-failed`,
        icon: 'ph--warning--regular',
        title: ['share-object-failed.title', { ns: meta.profile.key }],
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusy(false);
    }
  }, [object, access, role, link, linkKey, invokePromise]);

  const accessItems = [
    { value: 'restricted', label: t('share-object-dialog.access.restricted.label'), icon: 'ph--lock-simple--regular' },
    {
      value: 'anyone',
      label: t('share-object-dialog.access.anyone.label'),
      icon: 'ph--globe-hemisphere-west--regular',
    },
  ];
  const roleItems = [
    { value: 'editor', label: t('share-object-dialog.role.editor.label') },
    { value: 'viewer', label: t('share-object-dialog.role.viewer.label') },
  ];

  return (
    <Dialog.Content data-testid='share-object-dialog'>
      <Dialog.Header>
        <Dialog.Title>{t('share-object-dialog.title', { label })}</Dialog.Title>
        <Dialog.CloseTrigger asChild>
          <SystemButton.Close />
        </Dialog.CloseTrigger>
      </Dialog.Header>
      <Dialog.Body>
        <Layout.Flex column gap='form-section' classNames='py-2'>
          <Layout.Flex column gap='xs' asChild>
            <section>
              <Typography.Text tone='muted'>{t('share-object-dialog.people.heading')}</Typography.Text>
              <Listbox.Root items={people.map((person) => ({ value: person.id, label: person.name }))}>
                <Listbox.Content aria-label={t('share-object-dialog.people.heading')}>
                  {people.map((person) => (
                    <Listbox.Item key={person.id} id={person.id} data-testid='share-object-dialog.person'>
                      <Listbox.ItemIcon>
                        <Avatar.Root hue={Avatar.toAvatarHue(person.hue)} fallback={person.emoji} />
                      </Listbox.ItemIcon>
                      <Listbox.ItemText>
                        {person.self ? t('share-object-dialog.you.label', { name: person.name }) : person.name}
                      </Listbox.ItemText>
                      <Typography.Text tone='muted'>
                        {t(`share-object-dialog.role.${person.role}.label`)}
                      </Typography.Text>
                    </Listbox.Item>
                  ))}
                </Listbox.Content>
              </Listbox.Root>
            </section>
          </Layout.Flex>

          <Layout.Flex column gap='xs' asChild>
            <section>
              <Typography.Text tone='muted'>{t('share-object-dialog.access.heading')}</Typography.Text>
              <Layout.Flex gap='sm' align='center'>
                <Avatar.Root
                  icon={access === 'anyone' ? 'ph--globe-hemisphere-west--regular' : 'ph--lock-simple--regular'}
                  hue={Avatar.toAvatarHue(access === 'anyone' ? 'emerald' : 'neutral')}
                />
                <Layout.Flex column grow>
                  <Select.Root
                    items={accessItems}
                    value={[access]}
                    onValueChange={({ value: [value] }) => setAccess(value === 'restricted' ? 'restricted' : 'anyone')}
                  >
                    <Select.Trigger data-testid='share-object-dialog.access' />
                    <Select.Content>
                      {accessItems.map((item) => (
                        <Select.Item key={item.value} item={item} />
                      ))}
                    </Select.Content>
                  </Select.Root>
                  <Typography.Text tone='muted'>
                    {t(`share-object-dialog.access.${access}.description`)}
                  </Typography.Text>
                </Layout.Flex>
                {access === 'anyone' && (
                  <Select.Root
                    items={roleItems}
                    value={[role]}
                    onValueChange={({ value: [value] }) => setRole(value === 'viewer' ? 'viewer' : 'editor')}
                  >
                    <Select.Trigger data-testid='share-object-dialog.role' />
                    <Select.Content>
                      {roleItems.map((item) => (
                        <Select.Item key={item.value} item={item} />
                      ))}
                    </Select.Content>
                  </Select.Root>
                )}
              </Layout.Flex>
              {access === 'anyone' && scope.length > 0 && (
                <Typography.Text tone='subtle' data-testid='share-object-dialog.scope'>
                  {t('share-object-dialog.scope.label', {
                    count: scope.length,
                    labels: scope
                      .map((entry) => Obj.getLabel(entry) ?? t('share-object-dialog.untitled.label'))
                      .join(', '),
                  })}
                  {pluginNames.length > 0 &&
                    ` · ${t('share-object-dialog.plugins.label', { names: pluginNames.join(', ') })}`}
                </Typography.Text>
              )}
            </section>
          </Layout.Flex>

          {link && <Input.Root readOnly value={link} copyable data-testid='share-object-dialog.link' />}
        </Layout.Flex>
      </Dialog.Body>
      <Dialog.Footer classNames='justify-between'>
        <Button.Root
          icon={copied ? 'ph--check--regular' : 'ph--link--regular'}
          disabled={busy}
          onClick={() => void handleCopy()}
          data-testid='share-object-dialog.copy-link'
        >
          {busy
            ? t('share-object-dialog.creating-link.label')
            : copied
              ? t('share-object-dialog.copied.label')
              : t('share-object-dialog.copy-link.label')}
        </Button.Root>
        <Dialog.CloseTrigger asChild>
          <Button.Root variant='primary' data-testid='share-object-dialog.done'>
            {t('share-object-dialog.done.label')}
          </Button.Root>
        </Dialog.CloseTrigger>
      </Dialog.Footer>
    </Dialog.Content>
  );
};

ShareObjectDialog.displayName = 'ShareObjectDialog';

type Person = {
  id: string;
  name: string;
  hue: string;
  emoji: string;
  role: 'owner' | 'editor' | 'viewer';
  self: boolean;
};

const toPerson = (member: SpaceMember, self = false): Person => {
  const identityKey = toPublicKey(member.identity?.identityKey);
  const id = identityKey?.toHex() ?? '';
  const fallback = identityKey ? keyToFallback(identityKey) : { hue: 'neutral', emoji: '' };
  return {
    id,
    name: member.identity?.profile?.displayName ?? generateName(id),
    hue: fallback.hue,
    emoji: fallback.emoji,
    role:
      member.role === SpaceMember_Role.OWNER || member.role === SpaceMember_Role.ADMIN
        ? 'owner'
        : member.role === SpaceMember_Role.READER
          ? 'viewer'
          : 'editor',
    self,
  };
};
