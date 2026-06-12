# Bratislava Castle — a cinematic 3D model

A real-time, procedurally built 3D model of **Bratislava Castle** and its
surroundings — the Danube, Most SNP (the UFO bridge), St. Martin's Cathedral,
the old town, vineyard slopes and the Petržalka bank — rendered with Three.js
at golden hour, with a free-view camera system and a directed 20-second
cinematic showcase.

**Live demo:** [Hugging Face Space](https://huggingface.co/spaces/mrshu/claude-fable-5-bratislava-castle-oneshot)
·
**Source:** [GitHub](https://github.com/mrshu/claude-fable-5-bratislava-castle-oneshot)

Built in a single session ("one-shot") by Claude Fable 5, originating from
this prompt, verbatim:

> create the most realistic and accurate 3D model of the Bratislava castle
> (with surrounding scenery). build a camera system to allow free view
> inspection of the model.
>
> Put it all together in the end with a 20 second showcase in a very
> impressive way. You will be the director of that 20 second showcase, make
> the most of it, make it cinematic, and most of all make no mistakes.

## Run it

```bash
python3 -m http.server 8765
# open http://localhost:8765
```

No build step, no network access needed — Three.js r160 is vendored in
`vendor/`, every texture is painted onto canvases at load, and the score is
generated with WebAudio.

## What you get

- **▶ Begin Showcase** — a 20-second flight in four movements: low over the
  Danube toward the UFO bridge, a rise along the castle hill to the Crown
  Tower, a hero arc over the Honorary Courtyard and Svatopluk's statue, and a
  pull-back aerial with the sun flaring behind the castle. Letterboxed, titled,
  scored (a D-minor pad that resolves to D major on the final aerial).
  `ESC` skips, `R` replays.
- **Orbit mode** — drag to orbit, scroll to zoom, right-drag to pan.
- **Fly mode** (`F` or the HUD chip) — pointer-lock WASD + mouse look,
  `E`/`Q` up/down, `Shift` boost, scroll adjusts speed. The camera never
  clips below the terrain.

## Faithful details

- Four-winged white palace around the inner courtyard ("the upturned table"),
  with the larger SW **Crown Tower** (47 m) flying the Slovak flag
- Honorary Courtyard facing the old town, with the equestrian statue of
  King Svatopluk and the trophy-gate pylons
- Restored baroque garden on the northern terrace
- Fortification ring with south bastions, Sigismund (SE) and Vienna (SW) gates,
  and the walled eastern approach ramp
- Most SNP with its leaning pylon, saucer deck and single-plane cable stays —
  and no pier in the river, like the real one
- St. Martin's Cathedral with the gilded crown on its spire, Michael's Gate's
  green onion dome, the Old Town Hall, Slavín on the NW hills, the modernist
  parliament on the plateau edge, cruise boats and Petržalka's panel blocks

## Architecture

| file | role |
| --- | --- |
| `src/terrain.js` | analytic heightfield (hill, plateau, Danube, town basin), vertex-colored terrain, water shader |
| `src/sky.js` | golden-hour sky dome shader (sun disc, cirrus), sun/hemisphere lighting |
| `src/castle.js` | palace, towers, courtyards, garden, walls, gates, ramp, statue, waving flag |
| `src/city.js` | merged old town, landmarks, Most SNP |
| `src/nature.js` | instanced trees, vineyard rows, a flock of swallows |
| `src/cameras.js` | orbit + fly rig with terrain collision |
| `src/cinematic.js` | time-keyed camera/look tracks, eased time warp, banking, titles |
| `src/audio.js` | generative 20-second WebAudio score |
| `src/textures.js` | canvas-painted facades, roofs, paving, the Slovak flag |
