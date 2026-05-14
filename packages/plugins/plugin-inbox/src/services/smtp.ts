//
// Copyright 2026 DXOS.org
//

// The SMTP service Tag + transport types live in @dxos/functions so both ends of the
// operation runtime (composer-side managed runtime and Workers-side function bundles)
// can reach them without a dependency cycle through plugin-inbox.
export { Smtp, SmtpAuth, SmtpError, SmtpUnavailable, readSmtpPassword } from '@dxos/functions';
export type { SmtpAuthValues, SmtpSendInput, SmtpServiceShape } from '@dxos/functions';
