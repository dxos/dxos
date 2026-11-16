-- What kind of messages each product channel gets.
SELECT p.product, c.kind, COUNT(*) AS messages
FROM classification c JOIN product_mention p ON p.message_id = c.message_id
WHERE c.kind IN ('question', 'bug-report', 'feature-request', 'feedback')
GROUP BY p.product, c.kind HAVING messages >= 5 ORDER BY p.product, messages DESC;
