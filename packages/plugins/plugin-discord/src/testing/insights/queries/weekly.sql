-- Human messages per ISO week.
SELECT strftime('%Y-W%W', ts) AS week, COUNT(*) AS messages FROM message WHERE is_bot = 0 GROUP BY week ORDER BY week;
