//
// Copyright 2026 DXOS.org
//

import * as Comlink from 'comlink';

import { DEFAULT_CHANNEL, eventNames, type DevtoolsHostApi } from './api';
import { type RenderContext, withRenderContext } from './builders';
import { createCustomEventEndpoint } from './endpoint';
import type { DispatchableId, PanelDefinition, PanelInfo, SpecNode } from './spec';

type DispatchEntry =
  | { kind: 'action'; handler: () => void }
  | { kind: 'input'; handler: (value: string) => void }
  | { kind: 'select'; handler: (value: string) => void };

type RegisteredPanel = {
  definition: PanelDefinition;
  mounted: boolean;
  /** Map of `handlerId -> handler` populated each render. */
  dispatchTable: Map<DispatchableId, DispatchEntry>;
  treeSubscribers: Map<number, (tree: SpecNode) => void>;
  lastTree?: SpecNode;
};

const makeIdGenerator = (prefix: string) => {
  let counter = 0;
  return () => `${prefix}-${++counter}`;
};

class DevtoolsHost implements DevtoolsHostApi {
  readonly #panels = new Map<string, RegisteredPanel>();
  readonly #panelListSubscribers = new Map<number, (panels: PanelInfo[]) => void>();
  #nextSubscriptionId = 1;

  showPanel(definition: PanelDefinition): void {
    if (this.#panels.has(definition.id)) {
      throw new Error(`Panel already registered: ${definition.id}`);
    }
    const panel: RegisteredPanel = {
      definition,
      mounted: false,
      dispatchTable: new Map(),
      treeSubscribers: new Map(),
    };
    this.#panels.set(definition.id, panel);
    this.#notifyPanelList();

    // Mount lazily on first subscription so the page side doesn't pay the
    // cost when no panel is open.
  }

  removePanel(panelId: string): void {
    const panel = this.#panels.get(panelId);
    if (!panel) {
      return;
    }
    if (panel.mounted) {
      panel.definition.onUnmount?.();
      panel.mounted = false;
    }
    this.#panels.delete(panelId);
    this.#notifyPanelList();
  }

  // ------------------------------------------------------------------
  // DevtoolsHostApi (called by the panel via Comlink).
  // ------------------------------------------------------------------

  listPanels = async (): Promise<PanelInfo[]> => {
    return Array.from(this.#panels.values()).map(({ definition }) => ({
      id: definition.id,
      name: definition.name,
    }));
  };

  subscribe = async (panelId: string, onChange: (tree: SpecNode) => void): Promise<number> => {
    const panel = this.#panels.get(panelId);
    if (!panel) {
      throw new Error(`Unknown panel: ${panelId}`);
    }
    const id = this.#nextSubscriptionId++;
    panel.treeSubscribers.set(id, onChange);

    if (!panel.mounted) {
      panel.mounted = true;
      panel.definition.onMount?.({
        update: () => this.#renderAndPush(panelId),
      });
    }
    this.#renderAndPush(panelId);
    return id;
  };

  unsubscribe = async (subscriptionId: number): Promise<void> => {
    for (const panel of this.#panels.values()) {
      if (panel.treeSubscribers.delete(subscriptionId) && panel.treeSubscribers.size === 0) {
        if (panel.mounted) {
          panel.definition.onUnmount?.();
          panel.mounted = false;
          panel.dispatchTable.clear();
        }
      }
    }
    this.#panelListSubscribers.delete(subscriptionId);
  };

  dispatch = async (panelId: string, handlerId: string, payload?: unknown): Promise<void> => {
    const panel = this.#panels.get(panelId);
    const entry = panel?.dispatchTable.get(handlerId);
    if (!entry) {
      return;
    }
    switch (entry.kind) {
      case 'action':
        entry.handler();
        break;
      case 'input':
      case 'select':
        entry.handler(String(payload ?? ''));
        break;
    }
  };

  subscribePanels = async (onChange: (panels: PanelInfo[]) => void): Promise<number> => {
    const id = this.#nextSubscriptionId++;
    this.#panelListSubscribers.set(id, onChange);
    void this.listPanels().then(onChange);
    return id;
  };

  // ------------------------------------------------------------------
  // Internals.
  // ------------------------------------------------------------------

  #renderAndPush(panelId: string): void {
    const panel = this.#panels.get(panelId);
    if (!panel) {
      return;
    }

    panel.dispatchTable.clear();
    const nextActionId = makeIdGenerator('a');
    const nextInputId = makeIdGenerator('i');
    const nextSelectId = makeIdGenerator('s');

    const ctx: RenderContext = {
      registerAction: (handler) => {
        const id = nextActionId();
        panel.dispatchTable.set(id, { kind: 'action', handler });
        return id;
      },
      registerInput: (handler) => {
        const id = nextInputId();
        panel.dispatchTable.set(id, { kind: 'input', handler });
        return id;
      },
      registerSelect: (handler) => {
        const id = nextSelectId();
        panel.dispatchTable.set(id, { kind: 'select', handler });
        return id;
      },
    };

    const tree = withRenderContext(ctx, () => panel.definition.onRender());
    panel.lastTree = tree;
    for (const subscriber of panel.treeSubscribers.values()) {
      subscriber(tree);
    }
  }

  #notifyPanelList(): void {
    if (this.#panelListSubscribers.size === 0) {
      return;
    }
    void this.listPanels().then((panels) => {
      for (const subscriber of this.#panelListSubscribers.values()) {
        subscriber(panels);
      }
    });
  }
}

let installed: DevtoolsHost | undefined;
let installedChannel: string | undefined;

export type ComposerDevtoolsApi = {
  showPanel: (definition: PanelDefinition) => void;
  removePanel: (panelId: string) => void;
};

/**
 * Installs the page-side host. Idempotent. Returns an API for registering
 * panels and the underlying host (mostly useful for tests).
 *
 * Sets up:
 * - Comlink-exposed host API over a CustomEvent endpoint.
 * - A `hello` announce on load and in response to `probe` events from the
 *   content script — eliminates the page-loaded-first / extension-loaded-
 *   first race.
 */
export const installDevtools = (channel = DEFAULT_CHANNEL): ComposerDevtoolsApi => {
  if (!installed) {
    const host = new DevtoolsHost();
    const names = eventNames(channel);
    const endpoint = createCustomEventEndpoint(names.pageToExtension, names.extensionToPage);
    Comlink.expose(host, endpoint);

    const announce = () => {
      window.dispatchEvent(new CustomEvent(names.hello, { detail: { channel } }));
    };
    announce();
    window.addEventListener(names.probe, announce);
    installed = host;
    installedChannel = channel;
  } else if (installedChannel !== channel) {
    throw new Error(`installDevtools already initialized with channel '${installedChannel}', got '${channel}'.`);
  }

  return {
    showPanel: (definition) => installed!.showPanel(definition),
    removePanel: (panelId) => installed!.removePanel(panelId),
  };
};

/**
 * Convenience namespace mirroring the requested API surface:
 * `ComposerDevtools.showPanel(...)`, `ComposerDevtools.stack(...)`, etc.
 *
 * Builders only work inside a panel render pass — see `builders.ts`.
 */
export { stack, action, debug, input, select } from './builders';
