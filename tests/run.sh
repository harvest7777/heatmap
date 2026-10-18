#!/bin/bash
# Runs count.awk against the fixture and checks the JSON and snapshot output.
set -u
cd "$(dirname "$0")"
tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT
fail=0

awk -f ../count.awk -v out="$tmpdir/out.json" -v tmp="$tmpdir/snap.json" \
  fixture.log 2>"$tmpdir/stderr" >"$tmpdir/stdout"

if diff -u expected.json "$tmpdir/out.json"; then echo "ok   counts"; else echo "FAIL counts"; fail=1; fi
if [ ! -s "$tmpdir/stdout" ]; then echo "ok   nothing from the log printed"; else echo "FAIL printed to stdout:"; cat "$tmpdir/stdout"; fail=1; fi
if [ ! -s "$tmpdir/stderr" ]; then echo "ok   nothing printed to stderr"; else echo "FAIL printed to stderr:"; cat "$tmpdir/stderr"; fail=1; fi
if [ ! -e "$tmpdir/snap.json" ]; then echo "ok   no snapshot under 50 matches"; else echo "FAIL snapshot written early"; fail=1; fi

# 120 lines = 60 presses: snapshots at 50 and 100 lines, the last one holds 50
for _ in $(seq 120); do echo "<dbg> zmk: zmk_keymap_apply_position_state: layer_id: 1 position: 7, binding name: key_press"; done |
  awk -f ../count.awk -v out="$tmpdir/out2.json" -v tmp="$tmpdir/snap2.json" 2>/dev/null
if grep -q '"7": 50' "$tmpdir/snap2.json" && grep -q '"7": 60' "$tmpdir/out2.json"; then echo "ok   snapshot every 50 matches"; else echo "FAIL snapshot"; cat "$tmpdir/snap2.json" "$tmpdir/out2.json"; fail=1; fi

printf '' | awk -f ../count.awk -v out="$tmpdir/out3.json" -v tmp="$tmpdir/snap3.json" 2>/dev/null
if [ "$(cat "$tmpdir/out3.json")" = "{}" ]; then echo "ok   empty session is {}"; else echo "FAIL empty session:"; cat "$tmpdir/out3.json"; fail=1; fi

exit $fail
