#!/bin/bash
# Counts Corne key presses per layer from the ZMK USB debug log until the
# keyboard is unplugged, then saves sessions/<timestamp>_<label>.json.
# Usage: ./log.sh <port> [label], e.g. ./log.sh /dev/cu.usbmodem1101 coding
set -u
cd "$(dirname "$0")"

port=${1:-}
label=${2:-unnamed}
if [ -z "$port" ]; then
  echo "usage: ./log.sh <port> [label]   e.g. ./log.sh /dev/cu.usbmodem1101 coding" >&2
  exit 1
fi
if [ ! -e "$port" ]; then
  echo "no such port: $port" >&2
  exit 1
fi

mkdir -p sessions
name="$(date +%Y-%m-%dT%H-%M-%S)_${label//\//-}"
out="$PWD/sessions/$name.json"
tmp="$PWD/sessions/.$name.tmp.json"

# Ask for the password before cu starts printing
sudo -v || exit 1

# Only cu's output goes to awk, which keeps counts and nothing else
sudo cu -l "$port" | awk -f count.awk -v out="$out" -v tmp="$tmp" -v port="$(basename "$port")"

if [ -s "$out" ]; then
  rm -f "$tmp"
  echo "Saved to $out, $tmp deleted"
else
  echo "Failed to save $out; last snapshot (if any) is $tmp" >&2
  exit 1
fi
