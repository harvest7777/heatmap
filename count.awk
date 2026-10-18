# Counts ZMK key presses per layer and position from the USB debug log.
#
# Only counts are kept, never the order of presses, so nothing written can be
# used to reconstruct what was typed. Nothing from the log is printed.
#
# Vars (-v): out = final JSON path, tmp = snapshot path, port = shown to the user
#
# Each press logs zmk_keymap_apply_position_state once on press and once on
# release, so counts are halved (floor) when written. A &trans key logs once
# for its own layer and once for the layer it falls through to; both count.

BEGIN {
    matches = 0
    max_layer = -1
    max_pos = -1
    announced = 0
}

{ sub(/\r$/, "") }

# cu's own status lines, in case they arrive on stdout rather than stderr
/^Connected\.$/ {
    print > "/dev/stderr"
    announce()
    next
}
/^Disconnected\.$/ {
    print > "/dev/stderr"
    next
}

{ announce() }

/zmk_keymap_apply_position_state: layer_id: [0-9]+ position: [0-9]+/ {
    s = $0
    sub(/.*layer_id: /, "", s)
    layer = s + 0
    sub(/.*position: /, "", s)
    pos = s + 0

    count[layer, pos]++
    if (layer > max_layer) max_layer = layer
    if (pos > max_pos) max_pos = pos

    # Insurance against the laptop dying mid-session; always the same file so
    # snapshots can't be compared to recover typing order
    if (++matches % 50 == 0) write_json(tmp)
}

END { write_json(out) }

function announce() {
    if (announced) return
    announced = 1
    printf "Logging %s to %s\n", port, out > "/dev/stderr"
}

function write_json(path,    l, p, n, first_layer, first_pos) {
    printf "{" > path
    first_layer = 1
    for (l = 0; l <= max_layer; l++) {
        first_pos = 1
        for (p = 0; p <= max_pos; p++) {
            n = int(count[l, p] / 2)
            if (n == 0) continue
            if (first_pos) {
                printf "%s\n  \"%d\": {", (first_layer ? "" : ","), l > path
                first_layer = 0
                first_pos = 0
            } else {
                printf "," > path
            }
            printf "\n    \"%d\": %d", p, n > path
        }
        if (!first_pos) printf "\n  }" > path
    }
    printf "%s}\n", (first_layer ? "" : "\n") > path
    close(path)
}
