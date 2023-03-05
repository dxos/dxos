import { FormatParts, gatherLogInfoFromScope, getContextFromEntry, log, LogLevel, LogProcessor } from '@dxos/log'

export const registerLogCollector = () => {
  (log as any)._config.processor.push(TELEMETRY_PROCESSOR);
}

const TELEMETRY_PROCESSOR: LogProcessor = (config, entry) => {
  if(entry.level !== LogLevel.TELEMETRY) {
    return;
  }

  const { level, message, error, meta } = entry;

  const parts: FormatParts = { level, message, error };

  if (meta) {
    parts.path = meta.file;
    parts.line = meta.line;
  }

  const context = getContextFromEntry(entry);
  if (context) {
    // Remove undefined fields.
    // https://nodejs.org/api/util.html#utilinspectobject-options
    parts.context = context;
  }

  fetch('http://localhost:7630/api/telemetry', {
    method: 'POST',
    body: JSON.stringify(parts),
    headers: {
      'Content-Type': 'application/json',
    }
    // keepalive: true,
  })
}