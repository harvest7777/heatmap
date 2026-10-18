ultimate goal:
- a heatmap of my corne config that is capable of showing...
    - a single visual showing what keys are pressed the most not accounting for layers to answer the question "where are my hands most of the time?" this will give me a quantitative way to measure ergonomics instead of basing on feel. 
    - many visuals that show whicih keys are pressed most on a per layer basist o answer the qustion, which keys on certain layers do i not use at all and can safely delete? this will solve the problem of reconfiguring my corne, but then realizing that i needed the key that i just rebinded on a certain layer.

need: 
- the minimal information to make a heatmap of my keyboard

dont care:
- i dont care what keyr are actually pressed ex: {}()[]!?abcdefg
- i dont care if a key is shifted, pressed as a combination, etc

some implementation ideas:

- always keep track of the current layer state with these types of logs
set_layer_state: layer_changed: layer 3 state 0

- for each state, have a dictionary of what keys are pressed hwo many times which can be deduced from the current state + these logs
zmk_keymap_apply_position_state: layer_id: 0 position: 13, binding name: key_press
- even for sticky keys it still shows zmk_keymap_apply_position_state

these are the ONLY things i think i have to track. 

implementation details:
sudo cu -l /dev/tty.usbmodem1101 is what the debug logs are written to
i think that the easiest way would be to stream the cu outputs into a bash script that just writes into a json file.

data structure will just be 
{
    layer: {
        key number: times pressed
    }
}

ex:
{
    0: {
        0: 240,
        1: 123,
        etc etc...
    },
    1: {
        0: 240,
        1: 123,
        etc etc...
    },
}


when you disconnect your keyboard, it does 
cu: Got hangup signal

Disconnected.

i think we can just listend on this and for the bash script do a trap to write the outpets to a json file after, we can timestamp it so we can run a lot of sessinos without name conflict

i dont want to combine every json file so no read operations are needed. this will have n added bonus of being able to log sessisno for coding, internet surfing, essay typing etc to see who my layout performs under different curcumstances
