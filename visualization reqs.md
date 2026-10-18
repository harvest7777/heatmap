what do i care about the most?
where are my hands most of the time?
which keys on certain layers do i not use at all and can safely delete?

some options...

html file
- would be pretty interactable, you can over house for seeing how many times you pressed a key pre layer 
- can use the layout that https://nickcoutsos.github.io/keymap-editor/ uses which woiuld keep it intuitive
- claude is good at making html

png or svg?
- would be technically easier to share in higher res, but i tidont really care aboiut that i think


i think html is the way to go for visualizatino here, can just have some js logic to make the heatmap

what kind of heatmap do i want?
there are...
- gradient heatmaps like heatmap.js
    - looks pretty well documented


i think...
we  figure out how the conre is displayed from https://github.com/nickcoutsos/keymap-editor
MIT license so give creds where it is due

we can just omit the key labels or now, that coiuld be a nice feature for the future though
most the work like making the keyboard look good on small screens, exact IRL layout replica is done


lets not set any minimum data points for the heatmap generatino so ic an test easily and if people dont want 10,000 data points, acepting a less accurate map is their own choice

we do not have coordinents of the keypresses so, it would make most sense to just have the gradients start at the center of each key. we will have to tune hwo big the gradient is based on the size of the key in html.
