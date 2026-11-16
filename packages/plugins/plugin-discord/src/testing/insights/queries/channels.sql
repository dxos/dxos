-- Human messages per channel.
SELECT channel, COUNT(*) AS messages FROM message WHERE is_bot = 0 GROUP BY channel ORDER BY messages DESC;
