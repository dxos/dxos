//
// Copyright 2026 DXOS.org
//

import { SocketLines } from './socket-lines';

export interface SmtpClientAuth {
  username: string;
  password: string;
}

export interface SmtpClientOptions {
  host: string;
  /** 465 = implicit TLS, 587 = STARTTLS upgrade. */
  port?: 465 | 587;
  auth: SmtpClientAuth;
}

export interface SmtpSendOptions {
  /** Bare email (e.g. "user@example.com"). */
  from: string;
  /** Bare emails. */
  to: string[];
  /** Fully composed RFC 5322 message (headers + blank line + body). */
  rfc822: string;
}

const b64 = (s: string): string => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
};

/**
 * Minimal SMTP submission client targeting Cloudflare Workers (cloudflare:sockets).
 * Implements EHLO, STARTTLS upgrade on 587, AUTH PLAIN, MAIL FROM, RCPT TO (multi),
 * DATA + dot-stuffing, QUIT. Implicit-TLS on 465.
 */
export class SmtpClient {
  #sock!: SocketLines;
  #host: string;
  #port: 465 | 587;
  #auth: SmtpClientAuth;
  #capabilities: string[] = [];

  constructor(opts: SmtpClientOptions) {
    this.#host = opts.host;
    this.#port = opts.port ?? 465;
    this.#auth = opts.auth;
  }

  async connect(): Promise<void> {
    const transport = this.#port === 465 ? 'on' : 'starttls';
    this.#sock = SocketLines.open({ hostname: this.#host, port: this.#port, secureTransport: transport });
    await this.#expect(220);

    await this.#ehlo();

    if (this.#port === 587) {
      if (!this.#capabilities.some((c) => c.toUpperCase() === 'STARTTLS')) {
        throw new Error('Server did not advertise STARTTLS on port 587');
      }
      await this.#send('STARTTLS\r\n');
      await this.#expect(220);
      this.#sock.startTls();
      await this.#ehlo();
    }

    // AUTH PLAIN: base64( \0 user \0 pass )
    const token = b64(`\0${this.#auth.username}\0${this.#auth.password}`);
    await this.#send(`AUTH PLAIN ${token}\r\n`);
    await this.#expect(235);
  }

  async sendMessage(opts: SmtpSendOptions): Promise<void> {
    await this.#send(`MAIL FROM:<${opts.from}>\r\n`);
    await this.#expect(250);
    for (const rcpt of opts.to) {
      await this.#send(`RCPT TO:<${rcpt}>\r\n`);
      await this.#expect(250);
    }
    await this.#send('DATA\r\n');
    await this.#expect(354);
    await this.#send(dotStuff(opts.rfc822) + '\r\n.\r\n');
    await this.#expect(250);
  }

  async quit(): Promise<void> {
    try {
      await this.#send('QUIT\r\n');
      await this.#expect(221);
    } catch {}
    await this.#sock.close();
  }

  async #send(s: string): Promise<void> {
    await this.#sock.write(s);
  }

  async #ehlo(): Promise<void> {
    await this.#send('EHLO dxos-mail\r\n');
    const lines = await this.#readReply();
    if (lines.code !== 250) {
      throw new Error('EHLO failed: ' + lines.text);
    }
    // Each continuation line after the first is a capability advertisement.
    this.#capabilities = lines.lines.slice(1);
  }

  /** Reads a possibly multi-line SMTP reply. "<code>-<text>" continues; "<code> <text>" ends. */
  async #readReply(): Promise<{ code: number; text: string; lines: string[] }> {
    const lines: string[] = [];
    let code = 0;
    while (true) {
      const line = await this.#sock.readLine();
      const m = line.match(/^(\d{3})([ -])(.*)$/);
      if (!m) {
        throw new Error('Bad SMTP reply: ' + line);
      }
      code = parseInt(m[1]);
      lines.push(m[3]);
      if (m[2] === ' ') {
        return { code, text: lines.join('\n'), lines };
      }
    }
  }

  async #expect(code: number): Promise<{ code: number; text: string; lines: string[] }> {
    const r = await this.#readReply();
    if (r.code !== code) {
      throw new Error(`Expected SMTP ${code}, got ${r.code}: ${r.text}`);
    }
    return r;
  }
}

/** Dot-stuff a message body per RFC 5321 §4.5.2 — any line starting with '.' gets an extra '.'. */
function dotStuff(msg: string): string {
  // Ensure CRLF line endings.
  const crlf = msg.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
  return crlf.replace(/(^|\r\n)\./g, '$1..');
}
