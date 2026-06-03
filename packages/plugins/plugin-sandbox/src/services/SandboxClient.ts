//
// Copyright 2026 DXOS.org
//

export type SandboxRecord = {
  id: string;
  spaceId: string;
  name?: string;
  baseImage: string;
  createdAt: string;
  expiresAt: string;
};

export type ExecResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
};

export type FileEntry = {
  name: string;
  type: 'file' | 'directory';
  size?: number;
};

/**
 * HTTP client for the sandbox REST service.
 * Base path: /api/sandbox
 */
export class SandboxClient {
  constructor(private readonly _baseUrl: string) {}

  async createSandbox(
    spaceId: string,
    sandboxId: string,
    options?: { name?: string; baseImage?: string; expiresIn?: number },
  ): Promise<SandboxRecord> {
    const resp = await fetch(`${this._baseUrl}/api/sandbox/spaces/${spaceId}/sandboxes/${sandboxId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options ?? {}),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => resp.statusText);
      throw new Error(`Failed to create sandbox (${resp.status}): ${text}`);
    }
    const data = await resp.json();
    return data.sandbox as SandboxRecord;
  }

  async getSandbox(spaceId: string, sandboxId: string): Promise<SandboxRecord> {
    const resp = await fetch(`${this._baseUrl}/api/sandbox/spaces/${spaceId}/sandboxes/${sandboxId}`);
    if (!resp.ok) {
      const text = await resp.text().catch(() => resp.statusText);
      throw new Error(`Failed to get sandbox (${resp.status}): ${text}`);
    }
    const data = await resp.json();
    return data.sandbox as SandboxRecord;
  }

  async exec(
    spaceId: string,
    sandboxId: string,
    options: { command: string; cwd?: string; env?: Record<string, string>; timeout?: number; stdin?: string },
  ): Promise<ExecResult> {
    const resp = await fetch(`${this._baseUrl}/api/sandbox/spaces/${spaceId}/sandboxes/${sandboxId}/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => resp.statusText);
      throw new Error(`Failed to exec command (${resp.status}): ${text}`);
    }
    return resp.json() as Promise<ExecResult>;
  }

  async readFile(spaceId: string, sandboxId: string, path: string): Promise<string> {
    const url = new URL(`${this._baseUrl}/api/sandbox/spaces/${spaceId}/sandboxes/${sandboxId}/files`);
    url.searchParams.set('path', path);
    const resp = await fetch(url.toString());
    if (!resp.ok) {
      const text = await resp.text().catch(() => resp.statusText);
      throw new Error(`Failed to read file (${resp.status}): ${text}`);
    }
    const data = await resp.json();
    return data.content as string;
  }

  async writeFile(spaceId: string, sandboxId: string, path: string, content: string): Promise<void> {
    const url = new URL(`${this._baseUrl}/api/sandbox/spaces/${spaceId}/sandboxes/${sandboxId}/files`);
    url.searchParams.set('path', path);
    const resp = await fetch(url.toString(), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => resp.statusText);
      throw new Error(`Failed to write file (${resp.status}): ${text}`);
    }
  }
}
