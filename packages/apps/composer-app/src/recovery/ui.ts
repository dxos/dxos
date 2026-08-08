//
// Copyright 2026 DXOS.org
//

export type RecoveryAction = 'diagnostics' | 'boot' | 'reset' | 'export' | 'import' | 'logs' | 'debug-port';

export type RecoveryUi = {
  print: (message: string) => void;
  setBusy: (busy: boolean) => void;
  /** Relabels and highlights the debug-port button, and keeps it clickable while everything else is busy. */
  setDebugPortActive: (active: boolean) => void;
  onAction: (handler: (action: RecoveryAction) => void) => void;
};

export type CreateRecoveryUiOptions = {
  container: HTMLElement;
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
  { action: 'boot', label: 'Boot', title: 'Open full Composer at /', className: 'primary' },
  { action: 'reset', label: 'Reset', title: 'Wipe all origin storage', className: 'danger' },
  { action: 'export', label: 'Export', title: 'Export .dxprofile archive with OPFS SQLite database' },
  { action: 'import', label: 'Import', title: 'Import .dxprofile or raw .sqlite into OPFS DXOS database' },
  { action: 'logs', label: 'Logs', title: 'Download logs from IDB log collector' },
  { action: 'debug-port', label: 'Debug Port', title: 'Open agent debug port' },
];

/**
 * Builds the recovery page chrome with no framework dependency — the page must render when the
 * app bundle is exactly what cannot be trusted to load.
 */
export const createRecoveryUi = ({ container }: CreateRecoveryUiOptions): RecoveryUi => {
  container.classList.add('dxos-recovery');
  container.replaceChildren();

  const buttons = new Map<RecoveryAction, HTMLButtonElement>();
  const handlers: ((action: RecoveryAction) => void)[] = [];

  const createButton = ({ action, label, title, className }: ActionSpec): HTMLButtonElement => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.action = action;
    button.textContent = label;
    button.title = title;
    if (className) {
      button.classList.add(className);
    }
    button.addEventListener('click', () => handlers.forEach((handler) => handler(action)));
    buttons.set(action, button);
    return button;
  };

  const header = document.createElement('header');
  const heading = document.createElement('h1');
  heading.textContent = 'Composer Recovery';
  const subheading = document.createElement('p');
  subheading.textContent = 'Safe mode — static dxos globals only. Use Diagnostics to inspect the profile.';
  const headerActions = document.createElement('div');
  headerActions.className = 'header-actions';
  headerActions.append(...HEADER_ACTIONS.map(createButton));
  header.append(heading, subheading, headerActions);

  const log = document.createElement('pre');
  log.className = 'log';

  const footer = document.createElement('footer');
  const footerActions = document.createElement('div');
  footerActions.className = 'actions';
  footerActions.append(...FOOTER_ACTIONS.map(createButton));
  footer.append(footerActions);

  container.append(header, log, footer);

  let busy = false;
  let debugPortActive = false;

  const applyDisabled = () => {
    for (const [action, button] of buttons) {
      // The debug-port button is the one way out of a stuck session, so busy must not trap it.
      button.disabled = busy && !(action === 'debug-port' && debugPortActive);
    }
  };

  const debugPortButton = buttons.get('debug-port')!;

  return {
    print: (message) => {
      log.textContent += (log.textContent ? '\n' : '') + message;
      log.scrollTop = log.scrollHeight;
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
