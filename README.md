<img width="2950" height="1700" alt="_Users_ryantran_Developer_logger_viewer_index html (1)" src="https://github.com/user-attachments/assets/fbdd2c8a-5893-47ac-b0a3-9aefeff95861" />

<img width="2950" height="1700" alt="_Users_ryantran_Developer_logger_viewer_index html" src="https://github.com/user-attachments/assets/5bc00135-96ac-42f6-aa20-32bb33209e6c" />

This project gathers and visualizes the keypress heatmap for ZMK-firmware Corne keyboards. It works by parsing the debug data from ZMK, then visualizes with HTML. It supports both gradient and discrete heatmaps. 

The main usecase of the gradient heatmap is seeing where your hands spend the most time to measure ergonomics of a config. 

The main usecase of the discrete heatmap is seeing which keys are truly utilized for each layer to easily tell which are safe to rebind and delete. 

I made this because when rebinding keys, I often assume keys are useless when they are not, and I only realize I have been using those keys when I try to press them and they are not there. I have to reflash a ton of times and can never one shot a good layout. 

I am also learning [colemakdh](https://colemakmods.github.io/mod-dh/) and want to gauge how ergonomic it is on a columnstaggered, heavily layered, split keyboard.

Please note that **this uses ZMK debug, which literally streams your keystrokes!!!** This project runs entirely locally, but please read the code and understand the risks if you are concerned about security.

This is necessary to count which keys are being pressed. The raw keypress data NEVER leaves your machine and this does NOT require an internet connection to use. The order of keypresses are NEVER stored so it is not possible to reverse what you typed. Although the site is hosted on https://harvest7777.github.io/heatmap/viewer for free use and I do NOT save or send the non-sensitive count and keymap data anywhere else, you can just clone the repo and open the html file locally.


---

### Usage

1. Enable logging on your keyboard https://zmk.dev/docs/development/usb-logging
2. Flash the keyboard. Note that you shouldn't run this permanently since it drains more battery life. Flash a non-logging build after you're happy with the amount of data collected.
3. Plug in with USB C and find the port ```ls /dev/cu.usbmodem*```
4. Start the logger ```./log.sh /dev/cu.usbmodem(your port) (your session name)```
5. Stop logging by unplugging the USB C or CTRL C. The json file is saved automatically.
6. Repeat as many times as you need, then upload the jsons and optionally your keymap file to the visualizer. 

---

### AI usage


Claude Opus 5.5 was used for the implementation. The design and requirements were human designed and reviewed. Unfiltered human design and Claude responses are in the commit history and markdown files. This README.md is entirely human written. 

---

### Credits

- Website UI and Corne styling: https://github.com/nickcoutsos/keymap-editor
- Physical Corne layout and keycode names: https://github.com/zmkfirmware/zmk
- Icons: https://fontawesome.com
