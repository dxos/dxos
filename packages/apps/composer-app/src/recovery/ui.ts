//
// Copyright 2026 DXOS.org
//

import { Domino } from '@dxos/ui';

export type RecoveryAction = 'diagnostics' | 'boot' | 'reset' | 'export' | 'import' | 'logs' | 'debug-port';

export type RecoveryUi = {
  print: (message: string) => void;
  setBusy: (busy: boolean) => void;
  /** Relabels and highlights the debug-port button, and keeps it clickable while everything else is busy. */
  setDebugPortActive: (active: boolean) => void;
  onAction: (handler: (action: RecoveryAction) => void) => void;
};

type ActionSpec = {
  action: RecoveryAction;
  label: string;
  title: string;
  className?: string;
};

const HEADER_ACTIONS: ActionSpec[] = [
  {
    action: 'diagnostics',
    label: 'Diagnostics',
    title: 'Inspect OPFS/SQLite first, then boot client for identity and spaces',
  },
];

const FOOTER_ACTIONS: ActionSpec[] = [
  {
    action: 'boot',
    label: 'Boot',
    title: 'Open full Composer at /',
    className: 'primary',
  },
  {
    action: 'reset',
    label: 'Reset',
    title: 'Wipe all origin storage',
    className: 'danger',
  },
  {
    action: 'export',
    label: 'Export',
    title: 'Export .dxprofile archive with OPFS SQLite database',
  },
  {
    action: 'import',
    label: 'Import',
    title: 'Import .dxprofile or raw .sqlite into OPFS DXOS database',
  },
  {
    action: 'logs',
    label: 'Logs',
    title: 'Download logs from IDB log collector',
  },
  {
    action: 'debug-port',
    label: 'Debug Port',
    title: 'Open agent debug port',
  },
];

export type CreateRecoveryUiOptions = {
  container: HTMLElement;
};

/**
 * Builds the recovery page chrome with no framework dependency — the page must render when the
 * app bundle is exactly what cannot be trusted to load.
 */
export const createRecoveryUi = ({ container }: CreateRecoveryUiOptions): RecoveryUi => {
  container.classList.add('dxos-recovery');
  container.replaceChildren();

  const buttons = new Map<RecoveryAction, HTMLButtonElement>();
  const handlers: ((action: RecoveryAction) => void)[] = [];

  const createButton = ({ action, label, title, className }: ActionSpec) => {
    const button = Domino.of('button')
      .attributes({ type: 'button', title })
      .data('action', action)
      .classNames(className)
      .text(label)
      .on('click', () => handlers.forEach((handler) => handler(action)));
    buttons.set(action, button.root);
    return button;
  };

  const log = Domino.of('pre').classNames('log');

  Domino.of('header')
    .append(
      Domino.of('h1').text('Composer Recovery'),
      Domino.of('p').text('Safe mode — static dxos globals only. Use Diagnostics to inspect the profile.'),
      Domino.of('div')
        .classNames('header-actions')
        .append(...HEADER_ACTIONS.map(createButton)),
    )
    .mount(container);

  log.mount(container);

  Domino.of('footer')
    .append(
      Domino.of('div')
        .classNames('actions')
        .append(...FOOTER_ACTIONS.map(createButton)),
    )
    .mount(container);

  let busy = false;
  let debugPortActive = false;

  const applyDisabled = () => {
    for (const [action, button] of buttons) {
      // The debug-port button is the one way out of a stuck session, so busy must not trap it.
      button.disabled = busy && !(action === 'debug-port' && debugPortActive);
    }
  };

  const logElement = log.root;
  const debugPortButton = buttons.get('debug-port')!;

  return {
    print: (message) => {
      logElement.textContent += (logElement.textContent ? '\n' : '') + message;
      logElement.scrollTop = logElement.scrollHeight;
    },
    setBusy: (value) => {
      busy = value;
      applyDisabled();
    },
    setDebugPortActive: (active) => {
      debugPortActive = active;
      debugPortButton.textContent = active ? 'Stop Debug Port' : 'Debug Port';
      debugPortButton.classList.toggle('running', active);
      applyDisabled();
    },
    onAction: (handler) => {
      handlers.push(handler);
    },
  };
};
