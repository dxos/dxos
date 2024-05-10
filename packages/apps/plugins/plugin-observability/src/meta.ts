//
// Copyright 2023 DXOS.org
//

export const OBSERVABILITY_PLUGIN = 'dxos.org/plugin/observability';

export default {
  id: OBSERVABILITY_PLUGIN,
  name: 'Telemetry',
};

const OBSERVABILITY_ACTION = 'dxos.org/plugin/observability';
export enum ObservabilityAction {
  TOGGLE = `${OBSERVABILITY_ACTION}/toggle`,
  SEND_EVENT = `${OBSERVABILITY_ACTION}/send-event`,
  CAPTURE_USER_FEEDBACK = `${OBSERVABILITY_ACTION}/capture-feedback`,
}
