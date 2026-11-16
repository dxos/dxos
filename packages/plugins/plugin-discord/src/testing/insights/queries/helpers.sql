-- People who help others: a message in someone else's thread, or a reply to someone else's message.
-- Staff and recognised experts (server roles) are labelled; the interesting rows are external helpers.
WITH helped AS (
  SELECT m.author_id, m.author, COUNT(*) AS helps, COUNT(DISTINCT COALESCE(t.starter_id, m.reply_author_id)) AS people
  FROM message m LEFT JOIN thread t ON t.id = m.thread
  WHERE m.is_bot = 0 AND (
    (t.starter_id IS NOT NULL AND t.starter_id <> m.author_id) OR (m.reply_author_id IS NOT NULL AND m.reply_author_id <> m.author_id))
  GROUP BY m.author_id
), asked AS (
  SELECT author_id, COUNT(*) AS threads FROM (SELECT DISTINCT starter_id AS author_id, id FROM thread) GROUP BY author_id
)
SELECT h.author, COALESCE(mb.roles, '?') AS roles,
       CASE WHEN mb.staff = 1 THEN 'staff' WHEN mb.former = 1 THEN 'former staff' WHEN mb.expert = 1 THEN 'expert' WHEN mb.id IS NULL THEN 'unknown' ELSE 'community' END AS who,
       COALESCE(a.threads, 0) AS threads_started, h.people AS people_helped, h.helps
FROM helped h LEFT JOIN member mb ON mb.id = h.author_id LEFT JOIN asked a ON a.author_id = h.author_id
ORDER BY h.people DESC, h.helps DESC LIMIT 25;
