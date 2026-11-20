#!/bin/sh
set -eu
if /usr/sbin/lsof -nP -iTCP:27017 -sTCP:LISTEN >/dev/null 2>&1; then
  echo 'MongoDB (or another service) is already listening on port 27017.'
  exit 0
fi
if command -v mongod >/dev/null 2>&1; then
  MONGOD_BIN=$(command -v mongod)
elif [ -x /opt/homebrew/opt/mongodb-community@8.0/bin/mongod ]; then
  MONGOD_BIN=/opt/homebrew/opt/mongodb-community@8.0/bin/mongod
else
  echo 'mongod not found. Install MongoDB Community Server first.' >&2
  exit 1
fi
mkdir -p .local/mongodb
"$MONGOD_BIN" --nounixsocket --dbpath "$(pwd)/.local/mongodb" --bind_ip 127.0.0.1 --port 27017 --fork --logpath "$(pwd)/.local/mongodb.log"
