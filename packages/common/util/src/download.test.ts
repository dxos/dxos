//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { downloadBlob, downloadUrl } from './download';

const save = vi.hoisted(() => vi.fn<(options: { defaultPath?: string }) => Promise<string | null>>());
const writeFile = vi.hoisted(() => vi.fn<(path: string, data: Uint8Array) => Promise<void>>());

vi.mock('@tauri-apps/plugin-dialog', () => ({ save }));
vi.mock('@tauri-apps/plugin-fs', () => ({ writeFile }));

type AnchorStub = { click: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn>; style: { display?: string } };

const createAnchor = (): AnchorStub => ({ click: vi.fn(), remove: vi.fn(), style: {} });

describe('download', () => {
  let anchors: AnchorStub[];
  let revoked: string[];

  beforeEach(() => {
    anchors = [];
    revoked = [];
    vi.useFakeTimers();
    vi.stubGlobal('document', {
      createElement: () => {
        const anchor = createAnchor();
        anchors.push(anchor);
        return anchor;
      },
      body: { appendChild: vi.fn() },
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url) => {
      revoked.push(url);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    delete (globalThis as { __TAURI__?: unknown }).__TAURI__;
  });

  test('anchor is attached, clicked, then removed', () => {
    downloadUrl('blob:test', 'logs.ndjson');
    expect(anchors).toHaveLength(1);
    expect(anchors[0].click).toHaveBeenCalledOnce();
    expect(anchors[0].remove).toHaveBeenCalledOnce();
  });

  test('object URL outlives the click', async () => {
    await expect(downloadBlob(new Blob(['x']), 'logs.ndjson')).resolves.toBe(true);
    expect(revoked).toEqual([]);

    vi.runAllTimers();
    expect(revoked).toEqual(['blob:test']);
  });

  test('under tauri the native dialog is used instead of an anchor', async () => {
    (globalThis as { __TAURI__?: unknown }).__TAURI__ = {};
    save.mockResolvedValue('/tmp/logs.ndjson');

    await expect(downloadBlob(new Blob(['xyz']), 'logs.ndjson')).resolves.toBe(true);
    expect(save).toHaveBeenCalledWith({ defaultPath: 'logs.ndjson' });
    expect(writeFile).toHaveBeenCalledWith('/tmp/logs.ndjson', new Uint8Array([120, 121, 122]));
    expect(anchors).toHaveLength(0);
  });

  test('a cancelled native dialog writes nothing', async () => {
    (globalThis as { __TAURI__?: unknown }).__TAURI__ = {};
    save.mockResolvedValue(null);

    await expect(downloadBlob(new Blob(['x']), 'logs.ndjson')).resolves.toBe(false);
    expect(writeFile).not.toHaveBeenCalled();
  });

  test('an unreachable native dialog falls back to the anchor', async () => {
    (globalThis as { __TAURI__?: unknown }).__TAURI__ = {};
    save.mockRejectedValue(new Error('dialog.save not allowed'));

    await expect(downloadBlob(new Blob(['x']), 'logs.ndjson')).resolves.toBe(true);
    expect(writeFile).not.toHaveBeenCalled();
    expect(anchors).toHaveLength(1);
  });

  test('a write failure surfaces rather than falling back', async () => {
    (globalThis as { __TAURI__?: unknown }).__TAURI__ = {};
    save.mockResolvedValue('/tmp/logs.ndjson');
    writeFile.mockRejectedValue(new Error('disk full'));

    await expect(downloadBlob(new Blob(['x']), 'logs.ndjson')).rejects.toThrow('disk full');
    expect(anchors).toHaveLength(0);
  });
});
