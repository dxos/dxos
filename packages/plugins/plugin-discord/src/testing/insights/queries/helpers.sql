-- People who help others: a reply to someone else's message, or a message in a thread someone else started, counted by
-- the distinct people helped. Staff and recognised experts (server roles) are labelled; external helpers are the story.
WITH helped AS (
  SELECT m.author_id, m.author,
    CASE WHEN m.reply_author_id IS NOT NULL AND m.reply_author_id <> m.author_id THEN m.reply_author_id
         WHEN t.starter_id IS NOT NULL AND t.starter_id <> m.author_id THEN t.starter_id END AS person
  FROM message m LEFT JOIN thread t ON t.id = m.thread
  WHERE m.is_bot = 0
), totals AS (
  SELECT author_id, MAX(author) AS author, COUNT(*) AS helps, COUNT(DISTINCT person) AS people
  FROM helped WHERE person IS NOT NULL GROUP BY author_id
), asked AS (
  SELECT starter_id AS author_id, COUNT(*) AS threads FROM thread WHERE starter_id IS NOT NULL GROUP BY starter_id
)
SELECT h.author, COALESCE(mb.roles, '?') AS roles,
       CASE WHEN mb.staff = 1 THEN 'staff' WHEN mb.former = 1 THEN 'former staff' WHEN mb.expert = 1 THEN 'expert'
            WHEN mb.id IS NULL THEN 'no roles' ELSE 'community' END AS who,
       COALESCE(a.threads, 0) AS threads_started, h.people AS people_helped, h.helps
FROM totals h LEFT JOIN member mb ON mb.id = h.author_id LEFT JOIN asked a ON a.author_id = h.author_id
ORDER BY h.people DESC, h.helps DESC LIMIT 25;
