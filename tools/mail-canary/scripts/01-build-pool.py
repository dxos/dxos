#!/usr/bin/env python3
#
# Copyright 2026 DXOS.org
#

"""Step 01: turn Enron custodians' maildirs into an mbox for the canary's Gmail pool.

Picks `--limit` messages (default 10,000) evenly across the custodians' history, after dropping
duplicates (Enron folders repeat the same mail) and messages with no text body. Every date moves into
a window that ends `--end-days-ago` days before today. The pool must be older than the sync's 30-day
default window: that age, not a filter or archiving, is what keeps the canary's mailbox from syncing
the pool. Each message names its original folder in `X-Gmail-Labels` (`Enron/<custodian>/<folder>`);
step 02 turns that into a label, next to the `enron-pool` label every message gets.

Usage:
  python3 01-build-pool.py --maildir ~/enron/maildir --out pool/enron-pool.mbox
  python3 01-build-pool.py ... --limit 10   # a trial mbox to import first
"""

import argparse
import email
import email.policy
import email.utils
import hashlib
import mailbox
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Enron dates outside this range are corrupt (1979, 2044, ...); clamp them rather than drop the mail.
EARLIEST = datetime(1998, 1, 1, tzinfo=timezone.utc)
LATEST = datetime(2002, 12, 31, tzinfo=timezone.utc)


def parse_args(argv):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--maildir', required=True, type=Path, help='Extracted CMU Enron maildir root.')
    parser.add_argument(
        '--custodian',
        action='append',
        help='Custodian folder under the maildir; repeat for more. Default: kean-s, dasovich-j, kaminski-v.',
    )
    parser.add_argument('--out', required=True, type=Path, help='mbox file to write.')
    parser.add_argument('--end-days-ago', type=int, default=31, help='Newest message is this many days old.')
    parser.add_argument('--span-days', type=int, default=365, help='Spread messages over this many days.')
    parser.add_argument('--limit', type=int, default=10_000, help='Messages in the pool (0 = all).')
    return parser.parse_args(argv)


def read_message(path):
    with path.open('rb') as file:
        return email.message_from_binary_file(file, policy=email.policy.compat32)


def original_date(message):
    try:
        parsed = email.utils.parsedate_to_datetime(message.get('Date', ''))
    except (TypeError, ValueError):
        return EARLIEST
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return min(max(parsed, EARLIEST), LATEST)


def has_text(message):
    """Whether any text part has content: the Gmail mapper drops a message with no body, so its copy would never sync."""
    for part in message.walk():
        if part.get_content_maintype() == 'text':
            payload = part.get_payload(decode=True) or b''
            if payload.strip():
                return True
    return False


def content_key(message):
    body = b''.join(part.get_payload(decode=True) or b'' for part in message.walk() if not part.is_multipart())
    return (message.get('From', ''), message.get('Date', ''), message.get('Subject', ''), hashlib.sha256(body).hexdigest())


def remap(dates, end, span_days):
    """Maps original dates linearly onto [end - span, end], keeping their order and relative spacing."""
    first, last = min(dates), max(dates)
    source = (last - first).total_seconds() or 1.0
    target = timedelta(days=span_days).total_seconds()
    return [end - timedelta(seconds=(last - date).total_seconds() * target / source) for date in dates]


def main(argv):
    args = parse_args(argv)
    # One custodian files the same mail under several folders: kean-s has 25,351 files but 6,212
    # distinct messages, so a 10,000-message pool needs more than one.
    custodians = args.custodian or ['kean-s', 'dasovich-j', 'kaminski-v']
    paths = []
    for custodian in custodians:
        root = args.maildir / custodian
        if not root.is_dir():
            sys.exit(f'error: {root} is not a directory')
        paths.extend(sorted(path for path in root.rglob('*') if path.is_file() and not path.name.startswith('.')))
    if not paths:
        sys.exit(f'error: no messages under {", ".join(custodians)}')

    # Content key -> (message, its folders); None for a message with no text body.
    distinct, skipped_empty = {}, 0
    for path in paths:
        message = read_message(path)
        # The CMU release gives every file its own Message-ID, so a mail filed in several folders is
        # only recognizable by its content. Like Gmail, the pool keeps one copy with every folder as a label.
        key = content_key(message)
        folder = 'Enron/' + path.parent.relative_to(args.maildir).as_posix()
        if key in distinct:
            if distinct[key]:
                distinct[key][1].add(folder)
            continue
        if not has_text(message):
            distinct[key] = None
            skipped_empty += 1
            continue
        distinct[key] = (message, {folder})
    messages = []
    for entry in distinct.values():
        if entry:
            message, folders = entry
            message['X-Gmail-Labels'] = ','.join(sorted(folders))
            messages.append(message)
    print(f'read {len(paths)} files: {len(messages)} distinct messages with text, {skipped_empty} without a body')

    # An even sample across time, so the pool keeps the custodian's whole history rather than one folder.
    messages.sort(key=original_date)
    if args.limit and len(messages) > args.limit:
        step = len(messages) / args.limit
        messages = [messages[int(index * step)] for index in range(args.limit)]

    end = datetime.now(timezone.utc).replace(microsecond=0) - timedelta(days=args.end_days_ago)
    dates = remap([original_date(message) for message in messages], end, args.span_days)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    if args.out.exists():
        args.out.unlink()
    pool = mailbox.mbox(args.out, create=True)
    try:
        for message, date in zip(messages, dates):
            # Bcc would name recipients the original sender hid; it serves no test.
            del message['Bcc']
            del message['Date']
            message['Date'] = email.utils.format_datetime(date)
            if not message.get('Message-ID'):
                message['Message-ID'] = email.utils.make_msgid(domain='enron-pool.dxos.org')
            pool.add(message)
        pool.flush()
    finally:
        pool.close()

    print(f'wrote {len(messages)} messages to {args.out}, dated {min(dates).date()} to {max(dates).date()}')


if __name__ == '__main__':
    main(sys.argv[1:])
