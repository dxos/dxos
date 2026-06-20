//
// Copyright 2026 DXOS.org
//

import { SocketLines } from './socket-lines';

export interface ImapClientAuth {
  username: string;
  password: string;
}

export interface ImapClientOptions {
  host: string;
  /** TLS port (default 993). STARTTLS on 143 is not yet supported. */
  port?: number;
  auth: ImapClientAuth;
}

export interface MailboxState {
  uidValidity: number;
  uidNext: number;
  exists: number;
  highestModSeq?: number;
  flags: string[];
}

export interface RawEnvelope {
  uid: number;
  date?: string;
  subject?: string;
  from?: string;
  to?: string;
  messageId?: string;
  size?: number;
  flags: string[];
  internalDate?: string;
}

/** A parsed IMAP response line, with any embedded literals captured separately. */
interface RawResponse {
  /** The line text. Literals replaced with placeholder tokens \x00L0\x00, \x00L1\x00, … */
  text: string;
  literals: string[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const imapQuote = (s: string) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

/**
 * Minimal IMAP4rev1 client targeting Cloudflare Workers (cloudflare:sockets).
 * Implements LOGIN, SELECT (capturing UIDVALIDITY + UIDNEXT + HIGHESTMODSEQ),
 * UID SEARCH SINCE/UID range, UID FETCH ENVELOPE, LOGOUT. Includes an
 * ENVELOPE tokenizer with literal support.
 */
export class ImapClient {
  #sock!: SocketLines;
  #tagN = 0;
  #host: string;
  #port: number;
  #auth: ImapClientAuth;

  constructor(opts: ImapClientOptions) {
    this.#host = opts.host;
    this.#port = opts.port ?? 993;
    this.#auth = opts.auth;
  }

  async connect(): Promise<void> {
    this.#sock = SocketLines.open({
      hostname: this.#host,
      port: this.#port,
      secureTransport: 'on',
    });
    const greeting = await this.#readResponse();
    if (!greeting.text.startsWith('* OK')) {
      throw new Error('Bad IMAP greeting: ' + greeting.text);
    }
  }

  async login(): Promise<void> {
    await this.#command(`LOGIN ${imapQuote(this.#auth.username)} ${imapQuote(this.#auth.password)}`);
  }

  async select(mailbox: string): Promise<MailboxState> {
    const state: MailboxState = { uidValidity: 0, uidNext: 0, exists: 0, flags: [] };
    await this.#command(`SELECT ${imapQuote(mailbox)}`, (r) => {
      const line = r.text;
      let m;
      if ((m = line.match(/^\* (\d+) EXISTS/))) {
        state.exists = parseInt(m[1]);
      } else if ((m = line.match(/^\* OK \[UIDVALIDITY (\d+)\]/))) {
        state.uidValidity = parseInt(m[1]);
      } else if ((m = line.match(/^\* OK \[UIDNEXT (\d+)\]/))) {
        state.uidNext = parseInt(m[1]);
      } else if ((m = line.match(/^\* OK \[HIGHESTMODSEQ (\d+)\]/))) {
        state.highestModSeq = parseInt(m[1]);
      } else if ((m = line.match(/^\* FLAGS \(([^)]*)\)/))) {
        state.flags = m[1].split(/\s+/).filter(Boolean);
      }
    });
    return state;
  }

  async uidSearchSince(date: Date): Promise<number[]> {
    const d = `${date.getUTCDate().toString().padStart(2, '0')}-${MONTHS[date.getUTCMonth()]}-${date.getUTCFullYear()}`;
    const uids: number[] = [];
    await this.#command(`UID SEARCH SINCE ${d}`, (r) => {
      const m = r.text.match(/^\* SEARCH ?(.*)$/);
      if (m && m[1].trim()) {
        for (const tok of m[1].trim().split(/\s+/)) {
          uids.push(parseInt(tok));
        }
      }
    });
    return uids;
  }

  /** Fetches envelopes for messages with UID > sinceUid. Returns sorted ascending. */
  async uidFetchSince(sinceUid: number): Promise<RawEnvelope[]> {
    return this.uidFetchRange(`${sinceUid + 1}:*`);
  }

  async uidFetchRange(range: string): Promise<RawEnvelope[]> {
    const out: RawEnvelope[] = [];
    await this.#command(`UID FETCH ${range} (UID FLAGS INTERNALDATE RFC822.SIZE ENVELOPE)`, (r) => {
      if (!r.text.startsWith('* ')) {
        return;
      }
      const env = parseFetchResponse(r);
      if (env) {
        out.push(env);
      }
    });
    out.sort((a, b) => a.uid - b.uid);
    return out;
  }

  async logout(): Promise<void> {
    try {
      await this.#command('LOGOUT');
    } catch {}
    await this.#sock.close();
  }

  /** Sends a tagged command, dispatches untagged responses, returns the tagged result line. */
  async #command(cmd: string, onUntagged?: (r: RawResponse) => void): Promise<RawResponse> {
    const tag = 'a' + (++this.#tagN).toString().padStart(4, '0');
    await this.#sock.write(`${tag} ${cmd}\r\n`);
    while (true) {
      const r = await this.#readResponse();
      if (r.text.startsWith(tag + ' ')) {
        const status = r.text.slice(tag.length + 1).split(' ', 1)[0];
        if (status !== 'OK') {
          throw new Error(`IMAP ${cmd.split(' ')[0]} ${status}: ${r.text}`);
        }
        return r;
      }
      if (onUntagged) {
        onUntagged(r);
      }
    }
  }

  /** Reads one logical IMAP response — a line plus any embedded literals. */
  async #readResponse(): Promise<RawResponse> {
    let text = '';
    const literals: string[] = [];
    const decoder = new TextDecoder();
    while (true) {
      const line = await this.#sock.readLine();
      const m = line.match(/\{(\d+)\}$/);
      if (!m) {
        text += line;
        return { text, literals };
      }
      const n = parseInt(m[1]);
      // Strip {n} marker, insert placeholder.
      const placeholder = `\x00L${literals.length}\x00`;
      text += line.slice(0, line.length - m[0].length) + placeholder;
      const bytes = await this.#sock.readBytes(n);
      literals.push(decoder.decode(bytes));
      // Continue reading: there may be more line content after the literal.
    }
  }
}

// ---------- response parsing ----------

type Tok =
  | { kind: 'nil' }
  | { kind: 'str'; v: string } // quoted or literal
  | { kind: 'atom'; v: string } // atom or number
  | { kind: 'list'; v: Tok[] };

class Tokenizer {
  pos = 0;
  constructor(
    public s: string,
    public literals: string[],
  ) {}

  peek(): string | undefined {
    return this.s[this.pos];
  }

  skipWs(): void {
    while (this.pos < this.s.length && (this.s[this.pos] === ' ' || this.s[this.pos] === '\t')) {
      this.pos++;
    }
  }

  parse(): Tok {
    this.skipWs();
    const c = this.s[this.pos];
    if (c === '(') {
      return this.#parseList();
    }
    if (c === '"') {
      return this.#parseQuoted();
    }
    if (c === '\x00') {
      return this.#parseLiteralRef();
    }
    return this.#parseAtom();
  }

  #parseList(): Tok {
    this.pos++; // (
    const items: Tok[] = [];
    while (true) {
      this.skipWs();
      if (this.s[this.pos] === ')') {
        this.pos++;
        return { kind: 'list', v: items };
      }
      if (this.pos >= this.s.length) {
        throw new Error('Unterminated list');
      }
      items.push(this.parse());
    }
  }

  #parseQuoted(): Tok {
    this.pos++; // "
    let v = '';
    while (this.pos < this.s.length && this.s[this.pos] !== '"') {
      if (this.s[this.pos] === '\\' && this.pos + 1 < this.s.length) {
        v += this.s[this.pos + 1];
        this.pos += 2;
      } else {
        v += this.s[this.pos++];
      }
    }
    this.pos++; // closing "
    return { kind: 'str', v };
  }

  #parseLiteralRef(): Tok {
    // \x00L<n>\x00
    this.pos++; // \x00
    if (this.s[this.pos] !== 'L') {
      throw new Error('Bad literal ref');
    }
    this.pos++;
    let n = '';
    while (this.pos < this.s.length && this.s[this.pos] !== '\x00') {
      n += this.s[this.pos++];
    }
    this.pos++; // closing \x00
    return { kind: 'str', v: this.literals[parseInt(n)] ?? '' };
  }

  #parseAtom(): Tok {
    let v = '';
    while (this.pos < this.s.length && !' ()"\t\x00'.includes(this.s[this.pos])) {
      v += this.s[this.pos++];
    }
    if (v === 'NIL') {
      return { kind: 'nil' };
    }
    return { kind: 'atom', v };
  }
}

function parseFetchResponse(r: RawResponse): RawEnvelope | null {
  // Format: "* <seq> FETCH (key value key value ...)"
  const m = r.text.match(/^\* (\d+) FETCH \((.*)\)$/);
  if (!m) {
    return null;
  }
  const inner = m[2];
  const tok = new Tokenizer('(' + inner + ')', r.literals);
  const list = tok.parse();
  if (list.kind !== 'list') {
    return null;
  }

  const env: RawEnvelope = { uid: 0, flags: [] };
  // list.v is alternating [atom-key, value, atom-key, value, ...]
  for (let i = 0; i + 1 < list.v.length; i += 2) {
    const key = list.v[i];
    const val = list.v[i + 1];
    if (key.kind !== 'atom') {
      continue;
    }
    switch (key.v) {
      case 'UID':
        if (val.kind === 'atom') {
          env.uid = parseInt(val.v);
        }
        break;
      case 'FLAGS':
        if (val.kind === 'list') {
          env.flags = val.v.flatMap((t) => (t.kind === 'atom' || t.kind === 'str' ? [t.v] : []));
        }
        break;
      case 'RFC822.SIZE':
        if (val.kind === 'atom') {
          env.size = parseInt(val.v);
        }
        break;
      case 'INTERNALDATE':
        if (val.kind === 'str') {
          env.internalDate = val.v;
        }
        break;
      case 'ENVELOPE':
        if (val.kind === 'list') {
          extractEnvelopeFields(val.v, env);
        }
        break;
    }
  }
  return env.uid ? env : null;
}

function extractEnvelopeFields(items: Tok[], env: RawEnvelope): void {
  // ENVELOPE structure (RFC 3501 §7.4.2):
  //   date, subject, from, sender, reply-to, to, cc, bcc, in-reply-to, message-id
  const get = (t: Tok | undefined): string | undefined => (t && t.kind === 'str' ? t.v : undefined);
  env.date = get(items[0]);
  env.subject = get(items[1]);
  env.messageId = get(items[9]);
  env.from = formatAddressList(items[2]);
  env.to = formatAddressList(items[5]);
}

function formatAddressList(tok: Tok | undefined): string | undefined {
  if (!tok || tok.kind !== 'list') {
    return undefined;
  }
  const parts: string[] = [];
  for (const addr of tok.v) {
    if (addr.kind !== 'list') {
      continue;
    }
    // address structure: (personal-name source-route mailbox host)
    const personal = addr.v[0]?.kind === 'str' ? addr.v[0].v : undefined;
    const mailbox = addr.v[2]?.kind === 'str' ? addr.v[2].v : undefined;
    const host = addr.v[3]?.kind === 'str' ? addr.v[3].v : undefined;
    if (mailbox && host) {
      const email = `${mailbox}@${host}`;
      parts.push(personal ? `${personal} <${email}>` : email);
    }
  }
  return parts.length ? parts.join(', ') : undefined;
}
