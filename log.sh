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

# cat, not cu: cu refuses to run with its output piped ("Can't set terminal
# settings"), and cat needs no sudo or uucp lock files. Raw mode and no echo,
# so the log isn't line-edited or echoed back to the keyboard.
# One fd for both, so the settings can't reset between opens.
exec 3<"$port" || exit 1
stty raw -echo <&3 || exit 1
echo "Connected."
echo "Logging $(basename "$port") to $out"

# Ctrl-C ends only cat (handlers reset on exec, ignores don't), so awk still
# reaches its end and saves, same as unplugging
trap ':' INT
cat <&3 | (trap '' INT; exec awk -f count.awk -v out="$out" -v tmp="$tmp")
trap - INT
exec 3<&-
echo "Disconnected."

if [ -s "$out" ]; then
  rm -f "$tmp"
  echo "Saved to $out, $tmp deleted"
else
  echo "Failed to save $out; last snapshot (if any) is $tmp" >&2
  exit 1
fi
