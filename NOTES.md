# Slope-Intercept Explorer -- Project Notes

## Project Overview
Interactive browser-based tool for learning the slope-intercept form (y = mx + b).
Built with vanilla HTML/CSS/JS, no dependencies, hosted on GitHub Pages.

- **Repo**: https://github.com/guthers12/slope-intercept-app
- **Pages**: https://guthers12.github.io/slope-intercept-app/

## Current Features (Playground Mode)
- Canvas graph with grid, axes, and rendered line
- Draggable data points (orange = on line, gray = off line)
- Y-intercept (b) marker on graph with label
- Rise/run triangle with labeled legs
- Step points at integer x values
- Color-coded equation: orange = m (slope), teal = b (intercept)
- Template row (y = mx + b) aligned above editable input row
- Sliders for m and b with snap-to-zero
- Editable data table with add/remove/random
- Learning aids toggles (triangle, steps, snap to integers)
- Mouse wheel zoom centered on cursor
- Bidirectional sync across all controls
- When dragging a point, line anchors to the farthest point
- Responsive layout (desktop side-by-side, mobile stacked)

## Key Design Decisions
- Vanilla JS (no framework) so it runs from file:// and GitHub Pages with no build step
- Single app.js IIFE -- ES modules don't work over file:// protocol
- Constrained line fitting: dragging an endpoint anchors the opposite endpoint, middle points go gray
- Snap to integers is ON by default (most textbook problems use integers)
- Colors are consistent everywhere: orange = slope (m), teal = intercept (b), gold = data points
- Random button respects current zoom level

## Tech Details
- Canvas rendering with devicePixelRatio support
- View bounds are mutable (zoom changes them)
- Labels drawn with semi-opaque white background for readability
- Linear regression used for table-driven updates; two-point line for drag updates

---

## Planned: Interactive Teaching Mode

A click-through guided lesson that animates concepts on the graph before
handing off to the playground. The user navigates with Forward/Back buttons.
The graph is narration-driven during the lesson (not interactive).

### Lesson Outline

**Step 1 -- The slope-intercept form**
> When you see a linear equation written like this: y = mx + b
> this is called slope-intercept form. It's just a way to describe a straight line.

*Graph: empty grid, the formula y = mx + b fades in at center*

**Step 2 -- What is y?**
> y is the output (the result). Think: where you are on the vertical axis.

*Graph: y-axis highlights, an arrow sweeps up and down it*

**Step 3 -- What is x?**
> x is the input. Think: where you are on the horizontal axis.

*Graph: x-axis highlights, an arrow sweeps left and right*

**Step 4 -- What is b (the y-intercept)?**
> b is where the line starts -- where it crosses the y-axis (when x = 0).
> If b = 5, the line starts at y = 5. If b = -3, it starts at y = -3.

*Graph: a dot appears at (0, b) with label "start here (b)". A few
different b values animate in sequence to show the dot moving up and down.*

**Step 5 -- What is m (the slope)?**
> m tells you how steep the line is -- how much y changes when x goes up by 1.
> If m = 2, every time x goes up 1, y goes up 2.
> If m = -1, every time x goes up 1, y goes down 1.
> Simple phrase: slope = rise over run.

*Graph: starting from (0, b), a rise/run triangle animates in.
Horizontal arrow labeled "run = 1", vertical arrow labeled "rise = m".
Then m changes to show the triangle growing/shrinking/flipping.*

**Step 6 -- Putting it together**
> The equation says: start at b, then move using the slope m.
> Start at the y-intercept (b). Use the slope to move along the line.

*Graph: dot at (0, b), then step-by-step dots appear at (1, b+m),
(2, b+2m), (3, b+3m)... each with a small rise/run step shown.
A line draws through all the dots.*

**Step 7 -- Simple example: y = 2x + 1**
> Start at 1 on the y-axis. Then: go right 1, up 2. Repeat.
> You're building the line step by step.

*Graph: animates this specific example with y=2x+1.
Dot at (0,1), step to (1,3), step to (2,5), line draws through.*

**Step 8 -- Big picture**
> Slope-intercept form answers two key questions:
> Where does the line start? → b
> How does it move? → m
>
> A line = start somewhere, then repeat the same step over and over.

*Graph: shows the full line with b highlighted and the repeating
rise/run pattern visible. Formula shown with colors.*

**Step 9 -- Now try it yourself!**
> Drag the points, move the sliders, edit the table.
> See how changing m and b changes the line.

*Transition to playground mode with all controls enabled.*

### Implementation Notes (for future chat)
- Teaching mode could be a separate HTML page or a modal/overlay on the existing page
- Each step is a JS object: { text, animateFn, cleanupFn }
- Animation uses requestAnimationFrame with easing
- Forward/Back buttons + step indicator (e.g. "3 of 9")
- Graph during teaching mode: same canvas, but controlled by the lesson script
- Transition to playground: remove overlay, enable all controls
- Consider: a "Replay" button on each step to re-run the animation

---

## Planned: Quiz Mode (future)
- Generate a random table of points, user must find the equation
- Score tracking, difficulty levels
- Timer optional
- Compare to the DeltaMath-style problems that inspired this project

## Other Ideas
- Pan the graph (drag on empty space)
- Touch pinch-to-zoom
- Dark mode toggle
- Export/share a specific line configuration via URL params
