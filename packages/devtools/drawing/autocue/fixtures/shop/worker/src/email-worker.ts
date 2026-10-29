//
// Copyright 2026 DXOS.org
//

import { Worker } from 'bullmq';
import pg from 'pg';
import { ServerClient } from 'postmark';

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const postmark = new ServerClient(process.env.POSTMARK_TOKEN ?? '');

// Consumes the API's email jobs, reads the order, and sends the receipt through Postmark.
new Worker(
  'emails',
  async (job) => {
    const order = await db.query('select * from orders where id = $1', [job.data.orderId]);
    await postmark.sendEmail({
      To: order.rows[0].email,
      From: 'shop@example.com',
      Subject: 'Receipt',
      TextBody: '...',
    });
  },
  { connection: { url: process.env.REDIS_URL } },
);
