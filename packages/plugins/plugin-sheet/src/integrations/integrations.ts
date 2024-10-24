//
// Copyright 2024 DXOS.org
//

import { create } from '@dxos/echo-schema';

export type Integration = {
  type: string;
  /**
   * An array of CSS class names to be applied to the content of the SheetCell.
   * These classes can be used to style the cell's content independently of its structure.
   */
  classNames?: string[];
  cellIndex: string;
};

export const createIntegrations = () => {
  // Reactive object to hold integrations
  // TODO(Zan): Use CELL ID's to key the integration map.
  // TODO(Zan): Consider maintaining an index of integrations by type.
  const { integrations } = create<{ integrations: Record<string, Integration[]> }>({ integrations: {} });

  const addIntegration = (cellIndex: string, decorator: Integration) => {
    integrations[cellIndex] = [...(integrations[cellIndex] || []), decorator];
  };

  const removeIntegration = (cellIndex: string, type?: string) => {
    if (type) {
      integrations[cellIndex] = (integrations[cellIndex] || []).filter((d) => d.type !== type);
    } else {
      delete integrations[cellIndex];
    }
  };

  // TODO(Zan): I should check if returning the a value from a map in a deep signal is a reactive slice.
  const getIntegrationsForCell = (cellIndex: string): Integration[] | undefined => {
    return integrations[cellIndex];
  };

  const getAllIntegrations = (): Integration[] => {
    const result: Integration[] = [];
    for (const decoratorArray of Object.values(integrations)) {
      for (const decorator of decoratorArray) {
        result.push(decorator);
      }
    }
    return result;
  };

  return {
    addIntegration,
    removeIntegration,
    getIntegrationsForCell,
    getAllIntegrations,
  } as const;
};

export type Integrations = ReturnType<typeof createIntegrations>;
