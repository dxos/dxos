//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { DXN, Obj, Type } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';

class Note extends Type.makeObject<Note>(DXN.make('com.example.type.note', '0.1.0'))(
  Schema.Struct({ title: Schema.optional(Schema.String) }),
) {}

const Settings = Capability.makeSingleton<import('effect/reactivity/Atom').Writable<{ compact: boolean }>>()(
  'com.example.plugin.notes.capability.settings',
);

// #region capabilities
export const SurfaceCount = () => {
  // Every contribution to a multi capability, re-rendering when plugins add or remove one.
  const surfaces = Hooks.useCapabilities(Capabilities.ReactSurface);
  return <span>{surfaces.length}</span>;
};
// #endregion

// #region invoke
export const OpenButton = ({ path }: { path: string }) => {
  const open = Hooks.useOperation(LayoutOperation.Open, () => ({ subject: [path] }));
  return <Button.Root onClick={() => open()}>Open</Button.Root>;
};

export const OpenTwice = ({ path }: { path: string }) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const handleClick = useCallback(async () => {
    await invokePromise(LayoutOperation.Open, { subject: [path] });
  }, [invokePromise, path]);
  return <Button.Root onClick={handleClick}>Open</Button.Root>;
};
// #endregion

// #region settings
export const CompactToggle = () => {
  const [settings, setSettings] = Hooks.useAtomCapabilityState(Settings);
  const { t } = UiHooks.useTranslation('com.example.plugin.notes');
  return (
    <Button.Root onClick={() => setSettings((current) => ({ ...current, compact: !current.compact }))}>
      {settings.compact ? t('expand.label') : t('compact.label')}
    </Button.Root>
  );
};
// #endregion

// #region reactivity
export const NoteTitle = ({ note }: { note: Note }) => {
  // Reading `note.title` in render does not subscribe. `useObject` returns a snapshot that does.
  const [snapshot] = useObject(note);
  const space = ToolkitHooks.useActiveSpace();
  const rename = useCallback(() => Obj.update(note, (note) => (note.title = 'Renamed')), [note]);
  return (
    <Button.Root onClick={rename} data-testid={space?.id}>
      {snapshot.title}
    </Button.Root>
  );
};
// #endregion
