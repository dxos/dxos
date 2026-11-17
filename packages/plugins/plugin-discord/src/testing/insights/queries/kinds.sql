-- What kind of messages mention each product (questions, bug reports, feature requests, feedback).
SELECT p.product, c.kind, COUNT(*) AS messages
FROM classification c JOIN product_mention p ON p.message_id = c.message_id JOIN message m ON m.id = c.message_id
WHERE c.kind IN ('question', 'bug-report', 'feature-request', 'feedback')
GROUP BY p.product, c.kind HAVING messages >= 5 ORDER BY p.product, messages DESC;
