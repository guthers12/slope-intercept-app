# Slope-Intercept Tutorial Mode — Build Spec (v2)

## Goal

Add a guided tutorial mode to the existing app that walks the user through
slope-intercept form one concept at a time, using animated visuals on the
same canvas, then hands off to the existing playground.

---

## 1. App Modes

Two modes, no chooser screen:

    mode = "tutorial" | "playground"

The app starts in **playground** mode (current behavior). A "Start Tutorial"
button is added to the controls panel. During the tutorial the controls panel
is replaced by the lesson panel. The tutorial has an exit button back to
playground. The playground has the "Start Tutorial" button always available.

---

## 2. Tutorial Controller

```
tutorialController = {
  currentStepIndex,
  steps[],
  activeCancelHandles[],

  start(),
  next(),
  back(),
  replay(),
  exit(),
  goToStep(index)
}
```

### Lifecycle

- **next()**: cleanup current step, advance index, execute next step.
- **back()**: cleanup current step, decrement index, re-execute previous
  step from scratch (each step must be idempotent / safe to replay).
- **replay()**: cleanup current step, re-execute it.
- **exit()**: cleanup current step, switch to playground mode.

### Cancellation

All in-flight animations are tracked in `activeCancelHandles[]`. When the
user clicks Next / Back / Replay / Exit, every handle is cancelled
immediately (jumping to end state or cleaning up), then the new step runs.
This keeps navigation responsive — no waiting for animations to finish.

---

## 3. Step Model

```
{
  id,
  headline,
  body,
  execute(ctx),
  cleanup(ctx)
}
```

- **execute(ctx)**: sets up graph state, runs animations, injects any panel
  controls. `ctx` provides the graph API and a reference to the panel's
  controls container div.
- **cleanup(ctx)**: cancels animations, removes overlays, resets graph state
  touched by this step.

No separate `setup`/`run` split. No `panelControls`/`panelBindings`
abstraction — steps that need interactive controls (slides 5, 8, 9) create
DOM elements directly in `ctx.controlsContainer` during execute.

---

## 4. State Integration

The tutorial reuses the existing `state` object and `draw()` pipeline:

- Calls `state.setLine(m, b)` to position the line (existing rendering
  works unchanged).
- Toggles `state.showTriangle` and `state.showSteps` as needed.
- The controls panel is hidden (display:none) and replaced by the lesson
  panel. No need to suppress state notifications — the hidden controls
  simply don't produce input.
- A `tutorialOverlay()` hook is called at the end of `draw()` when tutorial
  mode is active. This renders callouts, axis highlights, canvas text,
  animated dots, and the staircase visual on top of the base graph.

---

## 5. Slide Definitions

### Slide 1 — "The Slope-Intercept Form"

**Panel**: "When you see a linear equation written like this: y = mx + b,
this is called slope-intercept form. It's a recipe for drawing a straight
line."

**Graph**: Grid and axes visible, no line, no points, no triangle. The
formula "y = mx + b" fades in centered on the canvas, color-coded (orange m,
teal b).

**Interactivity**: None.

---

### Slide 2 — "What is y?"

**Panel**: "y is the output — the result you get. On the graph, it's how
high or low you are. Think: vertical position."

**Graph**: Formula from slide 1 fades out. Y-axis thickens and turns a
highlight color. An arrowhead animates smoothly from the bottom of the
visible y-axis to the top (~1s). A label "y" appears near the top.

**Interactivity**: None.

---

### Slide 3 — "What is x?"

**Panel**: "x is the input — the value you choose. On the graph, it's how
far left or right you are. Think: horizontal position."

**Graph**: Y-axis returns to normal. X-axis thickens and highlights. Arrow
sweeps left to right. Label "x" appears near the right end.

**Interactivity**: None.

---

### Slide 4 — "What is b (the y-intercept)?"

**Panel**: "b is where the line starts — the point where it crosses the
y-axis (when x = 0). If b = 3, the line starts at y = 3. If b = -2, it
starts at y = -2."

**Graph**: X-axis returns to normal. A teal dot appears at (0, 3) with
label "b = 3". After a beat the dot smoothly slides to (0, -2), label
updates. Then slides to (0, 5). Three values showing movement up and down
the y-axis. No line visible.

**Interactivity**: None.

---

### Slide 5 — "What is m (the slope)?"

**Panel**: "m tells you how steep the line is — how much y changes when x
goes up by 1. m = 2 means: go right 1, go up 2. m = -1 means: go right 1,
go down 1. Simple phrase: slope = rise over run."

**Graph**: Line appears with b = 1. A staircase of run-then-rise segments
walks across the full visible graph from left to right, each segment
animating in sequence:
1. Green dashed horizontal "run" segment extends right by 1 → label
   "run = 1" appears.
2. Orange dashed vertical "rise" segment extends up/down by m → label
   "rise = [m]" appears.
3. Repeat across the visible graph.

Labels appear on every leg of the staircase.

**Interactivity**: A slider in the panel controls m. Changing m
**re-animates** the staircase from scratch with the new value. b remains
fixed at 1.

---

### Slide 6 — "Putting It Together"

**Panel**: "The equation says: start at b, then use the slope to step along
the line. Start at the y-intercept. Go right 1, up (or down) by m. Repeat.
That's your line."

**Graph**: Uses m = 2, b = 1. Teal dot appears at (0, 1). After a beat,
the staircase animation builds step by step — run segment, rise segment,
new dot placed at the destination. Repeat for several steps across the
visible graph. Finally the full line draws through all the dots.

**Interactivity**: None (animation tells the story).

---

### Slide 7 — "Simple Example: y = 2x + 1"

**Panel**: "Let's try it: y = 2x + 1. Start at 1 on the y-axis. Then: go
right 1, up 2. Repeat. You're building the line step by step."

**Graph**: Same animation as slide 6 with explicit equation callout. The
color-coded formula "y = 2x + 1" (orange 2, teal 1) appears on the canvas.

**Interactivity**: None.

---

### Slide 8 — "The Big Picture"

**Panel**: "Slope-intercept form answers two questions: Where does the line
start? That's b. How does it move? That's m. A line is just: start
somewhere, then repeat the same step over and over."

**Graph**: Full line (m = 2, b = 1) with b-intercept dot highlighted, the
staircase pattern visible across the line, and the color-coded formula on
canvas.

**Interactivity**: A "Try Another" button generates a random integer m
(range -5 to 5) and b (within visible y range), rebuilds the graph with
the new equation, and updates the formula display.

---

### Slide 9 — "Now Try It Yourself!"

**Panel**: "You've got it! Now explore on your own. Drag the points. Move
the sliders. Edit the table. See how changing m and b changes the line."

**Graph**: Transitions to playground defaults.

**Interactivity**: A prominent "Enter Playground" button switches to
playground mode with full controls restored.

---

## 6. Graph Control API

Derived from what the slides actually need:

```
// Line and visibility (use existing state object)
state.setLine(m, b)
showLine(flag)
showBIntercept(flag)
showDataPoints(flag)

// Animated transitions
animateB(fromB, toB, duration)        // slide 4
animateLine(fromM, toM, b, duration)  // slide 5 slider

// Overlay: axis highlights (slides 2, 3)
highlightAxis(axis, color)
clearHighlights()

// Overlay: axis arrow animation (slides 2, 3)
animateAxisArrow(axis, duration)

// Overlay: canvas text (slides 1, 7, 8)
showCanvasText(text, options)         // { x, y, fontSize, colorMap }
clearCanvasText()

// Overlay: staircase (slides 5, 6, 7, 8)
animateStaircase(m, b, options)       // animated walk across graph
showStaircase(m, b)                   // static (for slide 8 initial view)
clearStaircase()

// Overlay: step dots (slides 6, 7)
addStepDot(x, y)
clearStepDots()

// Overlay: line-draw animation (slides 6, 7)
animateLineAppearance(m, b, duration)

// Reset everything
resetTutorialOverlays()
```

All animate functions return a cancel handle `{ cancel() }`.

---

## 7. Animation System

```
animate({ duration, easing, onUpdate, onComplete })
delay(ms)
sequence(steps[])
```

- `animate` returns `{ cancel() }`. Calling `cancel()` immediately fires
  `onComplete` with the final value, or cleans up.
- `delay` returns `{ cancel() }` which resolves the delay immediately.
- `sequence` takes an array of functions that each return a cancel handle.
  Runs them in order. Returns a composite `{ cancel() }` that cancels
  whichever step is in flight.
- Easing: `easeInOut` default, `linear` for arrows.

```
TIMING = {
  beat:   500,   // pause between sub-animations
  fast:   300,   // quick transitions
  normal: 600,   // standard animation
  slow:   1000,  // deliberate reveals
  stairStep: 400 // per-leg of staircase
}
```

---

## 8. Panel UI

```
┌──────────────────────────────┐
│  [X]              3 / 9  ◄ ►│
│                              │
│  Headline                    │
│                              │
│  Body text body text body    │
│  text body text.             │
│                              │
│  ┌──────────────────────┐    │
│  │ (controls area)      │    │
│  └──────────────────────┘    │
│                              │
│  [Watch Again]               │
└──────────────────────────────┘
```

- **Headline**: step title, styled prominently.
- **Body**: lesson text.
- **Controls area**: empty div that steps can populate (slider for slide 5,
  button for slides 8-9).
- **Navigation**: Back (left arrow), Next (right arrow), progress "N / 9".
- **Watch Again**: replays current step animation.
- **Close (X)**: exits tutorial, returns to playground.

Back is hidden on slide 1. Next is hidden on slide 9 (replaced by the
"Enter Playground" button in the controls area).

---

## 9. Overlay Rendering

The existing `draw()` function gains a hook at the end:

```
function draw() {
  ctx.clearRect(0, 0, width, height);
  drawGrid();
  drawAxes();
  if (tutorialShowLine) drawLine();        // conditional during tutorial
  if (state.showSteps) drawStepPoints();
  if (state.showTriangle) drawRiseRunTriangle();
  if (tutorialShowBDot) drawBIntercept();  // conditional during tutorial
  if (tutorialShowDataPts) drawDataPoints();
  if (tutorialActive) tutorialOverlay();   // new hook
}
```

`tutorialOverlay()` reads from an overlay state and renders:
- Axis highlights (thicker colored strokes over axes)
- Arrow animations (arrowhead along axis)
- Canvas text (color-coded formula)
- Staircase segments (green run / orange rise dashes with white backing)
- Step dots (placed during animation)

This keeps the base renderer untouched except for the visibility flags and
the single hook at the end.

---

## 10. Implementation Order

1. Mode system (tutorial/playground toggle, panel swap)
2. Tutorial controller skeleton (step array, navigation, cancel tracking)
3. Panel UI (headline, body, controls area, nav, progress, Watch Again)
4. Animation helpers (animate, delay, sequence with cancellation)
5. Overlay system (tutorialOverlay hook, overlay state, render functions)
6. Slides 1-3 (text + axis highlights + arrows — simplest visuals)
7. Slide 4 (animated b-dot)
8. Slide 5 (staircase + interactive slider — most complex)
9. Slides 6-7 (step-dot animation + line draw)
10. Slide 8 (summary + "Try Another" button)
11. Slide 9 (playground transition)
12. Polish pass (timing, easing, edge cases)

---

## 11. Constraints

- No frameworks — vanilla JS in the existing IIFE.
- Must run from `file://` — no ES modules, no build step.
- Keep the existing renderer intact; extend, don't replace.
- Favor clarity over abstraction.
- All new code goes in `js/app.js` inside the existing IIFE.

---

## 12. Success Criteria

- Mode switching works cleanly in both directions.
- All 9 steps play, replay, and navigate without visual artifacts.
- Staircase animation on slide 5 responds to slider in real time.
- "Try Another" on slide 8 generates valid random equations.
- Cancellation is instant — no animation lag on navigation.
- Tutorial is easy to extend with new slides.
