#!/usr/bin/env python3
#
# Copyright 2026 DXOS.org
#

"""Step 01: turn one Enron custodian's maildir into an mbox for the canary's Gmail pool.

Every message gets the `enron-pool` label (via `X-Gmail-Labels`, which GYB reads on restore) and a
date moved into a window that ends `--end-days-ago` days before today. The pool must be older than
the sync's 30-day default window: that age, not a filter or archiving, is what keeps the canary's
mailbox from syncing the pool.

Usage:
  python3 01-build-pool.py --maildir ~/enron/maildir --custodian kean-s --out pool/enron-pool.mbox
  python3 01-build-pool.py ... --limit 10   # a trial mbox to import first
"""

import argparse
import email
import email.policy
import email.utils
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
    parser.add_argument('--custodian', default='kean-s', help='Custodian folder under the maildir.')
    parser.add_argument('--out', required=True, type=Path, help='mbox file to write.')
    parser.add_argument('--label', default='enron-pool', help='Gmail label for every pool message.')
    parser.add_argument('--end-days-ago', type=int, default=31, help='Newest message is this many days old.')
    parser.add_argument('--span-days', type=int, default=365, help='Spread messages over this many days.')
    parser.add_argument('--limit', type=int, default=0, help='Write at most this many messages (0 = all).')
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


def remap(dates, end, span_days):
    """Maps original dates linearly onto [end - span, end], keeping their order and relative spacing."""
    first, last = min(dates), max(dates)
    source = (last - first).total_seconds() or 1.0
    target = timedelta(days=span_days).total_seconds()
    return [end - timedelta(seconds=(last - date).total_seconds() * target / source) for date in dates]


def main(argv):
    args = parse_args(argv)
    root = args.maildir / args.custodian
    if not root.is_dir():
        sys.exit(f'error: {root} is not a directory')

    paths = sorted(path for path in root.rglob('*') if path.is_file())
    if args.limit:
        paths = paths[: args.limit]
    if not paths:
        sys.exit(f'error: no messages under {root}')

    messages = [message for message in (read_message(path) for path in paths) if has_text(message)]
    if len(messages) < len(paths):
        print(f'skipped {len(paths) - len(messages)} messages without a text body')
    end =datetime.now(timezone.utc).replace(microsecond=0) - timedelta(days=args.end_days_ago)
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
            del message['X-Gmail-Labels']
            message['Date'] = email.utils.format_datetime(date)
            message['X-Gmail-Labels'] = args.label
            if not message.get('Message-ID'):
                message['Message-ID'] = email.utils.make_msgid(domain='enron-pool.dxos.org')
            pool.add(message)
        pool.flush()
    finally:
        pool.close()

    print(
        f'wrote {len(messages)} messages to {args.out}, '
        f'dated {min(dates).date()} to {max(dates).date()}, labelled {args.label}'
    )


if __name__ == '__main__':
    main(sys.argv[1:])
