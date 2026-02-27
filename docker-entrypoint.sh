#!/bin/sh
set -e

# Fix ownership of the bind-mounted data volume so the nextjs user can write
chown -R nextjs:nodejs /data 2>/dev/null || true

# Drop from root → nextjs and exec the real command
exec su-exec nextjs "$@"
