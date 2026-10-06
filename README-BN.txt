AS ANAMUL V1 — SYNCED USER PANEL

এই User Panel-এর backend-এ একটাই consolidated API function আছে:
 /.netlify/functions/api

PUBLIC:
?action=status
?action=validate

ADMIN:
?action=adminStatus
?action=generate
?action=reset
?action=setShortLink

Admin Panel সরাসরি এই API ব্যবহার করে। ফলে একই state/database-এ key, expiry, reset এবং GET KEY short link থাকে।

Test:
https://YOUR-USER-SITE.netlify.app/.netlify/functions/api?action=status

Expected JSON:
{"ok":true,"active":false,"shortLink":"https://adsfly.in/uhCA","expiresAt":null}

Default admin password: ANAMUL
