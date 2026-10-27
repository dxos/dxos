//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { CrxCapabilities, CrxOperation, PageAction } from '#types';

import { CrxNamespace } from '../namespace.ts';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    // Picker-only: these actions back the extension's DOM-picker toolbar and
    // are not surfaced in the popup or context menu.
    const actions: PageAction.PageAction[] = [
      {
        id: `${CrxNamespace.key}/page-action/add-person`,
        label: 'Person',
        icon: 'ph--user--regular',
        urlPatterns: ['http://*/*', 'https://*/*'],
        extractor: { name: 'snapshot' },
        contexts: ['picker'],
        operation: CrxOperation.AddPersonFromSnapshot,
      },
      {
        id: `${CrxNamespace.key}/page-action/add-organization`,
        label: 'Organization',
        icon: 'ph--building-office--regular',
        urlPatterns: ['http://*/*', 'https://*/*'],
        extractor: { name: 'snapshot' },
        contexts: ['picker'],
        operation: CrxOperation.AddOrganizationFromSnapshot,
      },
      {
        id: `${CrxNamespace.key}/page-action/add-note`,
        label: 'Note',
        icon: 'ph--note--regular',
        urlPatterns: ['http://*/*', 'https://*/*'],
        extractor: { name: 'snapshot' },
        contexts: ['picker'],
        operation: CrxOperation.AddNoteFromSnapshot,
      },
    ];
    return Capability.contribute(CrxCapabilities.PageAction, actions);
  }),
);
