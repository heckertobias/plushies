#!/bin/sh
set -e

# Ensure the data and uploads directories exist and are writable by the nextjs user
mkdir -p /data /uploads
chown -R nextjs:nodejs /data /uploads

exec su-exec nextjs node server.js
