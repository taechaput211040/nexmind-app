# Tech Office — codex imagegen prompt bank (byte / zeta / forge)

Finishes the TECH guild office (5-desk layout). REX + NOVA are the complete
reference agents (each has `work` / `desk` / `stand` / `walk`); this adds the
front-row trio plus the missing 2nd walk frame for everyone.

**17 images total:**
- byte / zeta / forge → `work`, `desk`, `stand`, `walk`, `walk2` (5 each = 15)
- rex / nova → just `walk2` (the only frame they're missing; adds the 2nd
  stride frame so the walk cycle animates smoothly instead of a single pose)

## Pipeline (run when codex limit clears)

1. Run the `codex exec` command for one sprite → it saves a raw image to
   `tmp/imagegen/<name>-source.png` on a **flat magenta `#ff00ff` chroma**
   backdrop.
2. Key + trim to a transparent sprite in `public/assets/map/`:
   ```
   node scripts/keymap.mjs tmp/imagegen/<name>-source.png <name> --bg=ff00ff
   ```
   (`keymap.mjs` auto-samples the corners if `--bg` is omitted; magenta is
   explicit here because cyan/green art must not be keyed by accident.)
3. Reload `/map`, enter TECH, eyeball placement; tune `OFFICE_STATIONS.tech`
   numbers in `MapGame.tsx` if a desk/character sits wrong.

Gen order per agent: **work → desk → stand → walk → walk2**. Generate `desk`
right after `work`, telling codex to reuse the exact same desk so the empty
desk matches the occupied one. Generate `walk`/`walk2` referencing `stand` so
the body/outfit stays identical across the cycle.

## Shared art rules (every sprite)

- **PORTRAIT IS THE SOURCE OF TRUTH.** Before generating, codex MUST open the
  canonical portrait `public/agents/<id>.png` and study it closely, then keep
  the sprite faithful to it: same face/features, same hair shape + colour, same
  outfit silhouette, same accent colours, same signature artifact/props. The
  map sprite is just that exact character re-drawn in pixel-art at a new
  pose/angle — NOT a new design. Every agent has a portrait in `public/agents/`.
- **TECH = BLUE/CYAN guild** — and the portraits already reflect this: dark
  graphite/black outfit with **cyan accents only**, no other accent colour. The
  one exception is anything the portrait itself shows (e.g. BYTE's green "API"
  lanyard badge) — copy those exactly. (Ignore the green in any old
  `char-*-stand/sit` sprites; those are off-model and being replaced.)
- Pixel-art style + iso angle must match the existing finals: open
  `public/assets/map/work-rex.png`, `desk-rex.png`, `char-rex-stand.png`,
  `char-rex-walk.png` as the style/scale/lighting reference.
- Flat **magenta `#ff00ff`** background, no shadow on the backdrop, sprite
  fully inside frame, no cropping at edges.
- `work`/`desk`: isometric 2:1, viewed front-right (same as rex's desk) — brown
  wood desk top, dark gaming chair with cyan trim, dual monitors showing
  code/dashboards, coffee mug. `work` = agent seated from a back-3/4 view
  actively working; `desk` = the identical desk EMPTY (no chair occupant).
- `stand`/`walk`/`walk2`: full-body, feet on ground, same character. `stand` =
  front / 3-4 view. The walk frames are a real **side / 3-4 walking stride
  facing the SAME direction as `char-rex-walk.png` (left)** — a weak
  near-standing pose is the #1 failure mode, so be explicit about biomechanics:
  - `walk` (contact pose): leading leg bent at the knee, foot planted forward of
    body center; trailing leg straight, pushed back behind; torso leaning
    slightly forward, weight shifted; arms swinging opposite the legs.
  - `walk2` (passing pose): the rear leg swung forward and passing nearly
    vertical under the body; the other leg pushing off behind on the toes; torso
    upright at the high point; arms swapped — visibly different from `walk` so
    the two alternate into a smooth cycle.
  If codex renders it facing the wrong way, re-key with `--flip`.

## Per-agent identity

- **BYTE** — backend "Iron Alchemist". Black spiky hair with cyan streaks, dark
  engineer jacket/apron, cyan circuit trim, green "API" badge on a lanyard (the
  ONLY non-cyan touch, straight off the portrait), fingerless gloves. Status:
  busy (the office shows `work-byte`).
- **ZETA** — QA "Chaos Tester". Black hair with cyan streaks, goggles pushed up
  on the head, dark coat with cyan trim, fracture lens over one eye, blue test
  vial, skull/warning glyph charms. Status: idle (office shows empty
  `desk-zeta` + zeta walking the floor — so `stand`/`walk`/`walk2` matter most).
- **FORGE** — DevOps "Iron Guardian". Dark hair with a cyan streak, heavy black
  deployment coat, armored shoulder, server-rack shield on one arm, cyan accents,
  "FORGE / DEPLOY" badges. Status: busy (office shows `work-forge`, drawn
  flipped — keep the sprite facing its natural direction; the engine mirrors it).

## Commands

> Replace `<PORTRAIT>` reads inline. Each command tells codex to open the
> reference images, generate one 1024² sprite on magenta, and save the source.

### BYTE
```
codex exec "Study public/agents/byte.png closely — the seated character must match BYTE's exact face, hair shape and colour palette from it. Also open public/assets/map/work-rex.png for the desk/iso style. Generate a pixel-art isometric workstation sprite of BYTE seated working: same iso angle, desk, chair, dual monitors and style as work-rex.png, but the seated character is BYTE — black spiky hair with cyan streaks, dark engineer jacket, CYAN accents only plus the green API lanyard badge, fingerless gloves, faithful to the portrait. Flat magenta #ff00ff background, no backdrop shadow, whole unit in frame. Save to tmp/imagegen/work-byte-source.png"

codex exec "Open the image you just made (tmp/imagegen/work-byte-source.png) and public/assets/map/desk-rex.png. Generate the EXACT same desk/chair/monitors unit but EMPTY — no person seated. Identical iso angle, wood desk, dark cyan-trim chair, dual monitors. Flat magenta #ff00ff background. Save to tmp/imagegen/desk-byte-source.png"

codex exec "Study public/agents/byte.png closely — match BYTE's exact face, hair and colour palette. Also open public/assets/map/char-rex-stand.png for style/scale/lighting. Generate a full-body pixel-art standing sprite of BYTE faithful to the portrait — black spiky hair with cyan streaks, dark engineer jacket, CYAN accents only plus green API lanyard badge, fingerless gloves, front 3/4 view, feet on ground. Flat magenta #ff00ff background, whole body in frame. Save to tmp/imagegen/char-byte-stand-source.png"

codex exec "Open tmp/imagegen/char-byte-stand-source.png and public/assets/map/char-rex-walk.png. Generate the SAME BYTE character in a walking pose (one foot forward, mid-stride contact pose) matching char-rex-walk.png style. Identical outfit/hair/colours as the stand sprite. Flat magenta #ff00ff background. Save to tmp/imagegen/char-byte-walk-source.png"

codex exec "Open tmp/imagegen/char-byte-walk-source.png. Generate the SAME BYTE character in the SECOND walk frame — opposite leg forward / passing pose for a 2-frame walk cycle. Identical outfit/hair/colours. Flat magenta #ff00ff background. Save to tmp/imagegen/char-byte-walk2-source.png"
```
Then:
```
node scripts/keymap.mjs tmp/imagegen/work-byte-source.png       work-byte       --bg=ff00ff
node scripts/keymap.mjs tmp/imagegen/desk-byte-source.png       desk-byte       --bg=ff00ff
node scripts/keymap.mjs tmp/imagegen/char-byte-stand-source.png char-byte-stand --bg=ff00ff
node scripts/keymap.mjs tmp/imagegen/char-byte-walk-source.png  char-byte-walk  --bg=ff00ff
node scripts/keymap.mjs tmp/imagegen/char-byte-walk2-source.png char-byte-walk2 --bg=ff00ff
```

### ZETA
```
codex exec "Study public/agents/zeta.png closely — match ZETA's exact face, hair and colour palette. Also open public/assets/map/char-rex-stand.png for style/scale/lighting. Generate a full-body pixel-art standing sprite of ZETA faithful to the portrait — black hair with cyan streaks, goggles pushed up on the head, dark coat with cyan trim, fracture lens over one eye, blue test vial, skull/warning charms, CYAN accents only, front 3/4 view, feet on ground. Flat magenta #ff00ff background, whole body in frame. Save to tmp/imagegen/char-zeta-stand-source.png"

codex exec "Open tmp/imagegen/char-zeta-stand-source.png and public/assets/map/char-rex-walk.png. Generate the SAME ZETA character walking (one foot forward, contact pose) in char-rex-walk.png style. Identical outfit/hair/colours. Flat magenta #ff00ff background. Save to tmp/imagegen/char-zeta-walk-source.png"

codex exec "Open tmp/imagegen/char-zeta-walk-source.png. Generate the SAME ZETA character, SECOND walk frame (opposite leg forward / passing pose). Identical outfit/hair/colours. Flat magenta #ff00ff background. Save to tmp/imagegen/char-zeta-walk2-source.png"

codex exec "Open public/agents/zeta.png and public/assets/map/desk-rex.png. Generate an EMPTY pixel-art isometric workstation (same desk/chair/monitors/iso angle/style as desk-rex.png) but with ZETA-flavoured cyan QA touches (a small warning/test glyph on a monitor). No person seated. Flat magenta #ff00ff background. Save to tmp/imagegen/desk-zeta-source.png"

codex exec "Study public/agents/zeta.png closely — match ZETA's exact face, hair and colours. Also open tmp/imagegen/desk-zeta-source.png and public/assets/map/work-rex.png. Generate the same desk-zeta unit but with ZETA seated working (back-3/4 view) in work-rex.png style, faithful to the portrait — black hair with cyan streaks, goggles, dark coat cyan trim. Flat magenta #ff00ff background. Save to tmp/imagegen/work-zeta-source.png"
```
Then:
```
node scripts/keymap.mjs tmp/imagegen/char-zeta-stand-source.png char-zeta-stand --bg=ff00ff
node scripts/keymap.mjs tmp/imagegen/char-zeta-walk-source.png  char-zeta-walk  --bg=ff00ff
node scripts/keymap.mjs tmp/imagegen/char-zeta-walk2-source.png char-zeta-walk2 --bg=ff00ff
node scripts/keymap.mjs tmp/imagegen/desk-zeta-source.png       desk-zeta       --bg=ff00ff
node scripts/keymap.mjs tmp/imagegen/work-zeta-source.png       work-zeta       --bg=ff00ff
```

### FORGE
```
codex exec "Study public/agents/forge.png closely — the seated character must match FORGE's exact face, hair and colour palette. Also open public/assets/map/work-rex.png for the desk/iso style. Generate a pixel-art isometric workstation sprite of FORGE seated working: same iso angle/desk/chair/monitors/style as work-rex.png, character is FORGE faithful to the portrait — dark hair with a cyan streak, heavy black deployment coat, armored shoulder, server-rack shield, CYAN accents only, FORGE/DEPLOY badges. Flat magenta #ff00ff background, whole unit in frame. Save to tmp/imagegen/work-forge-source.png"

codex exec "Open tmp/imagegen/work-forge-source.png and public/assets/map/desk-rex.png. Generate the EXACT same desk/chair/monitors unit but EMPTY — no person. Identical iso angle/style. Flat magenta #ff00ff background. Save to tmp/imagegen/desk-forge-source.png"

codex exec "Study public/agents/forge.png closely — match FORGE's exact face, hair and colour palette. Also open public/assets/map/char-rex-stand.png for style/scale/lighting. Generate a full-body pixel-art standing sprite of FORGE faithful to the portrait — dark hair with cyan streak, heavy black deployment coat, armored shoulder, server-rack shield, CYAN accents only, front 3/4 view, feet on ground. Flat magenta #ff00ff background, whole body in frame. Save to tmp/imagegen/char-forge-stand-source.png"

codex exec "Open tmp/imagegen/char-forge-stand-source.png and public/assets/map/char-rex-walk.png. Generate the SAME FORGE character walking (one foot forward, contact pose) in char-rex-walk.png style. Identical outfit/hair/colours. Flat magenta #ff00ff background. Save to tmp/imagegen/char-forge-walk-source.png"

codex exec "Open tmp/imagegen/char-forge-walk-source.png. Generate the SAME FORGE character, SECOND walk frame (opposite leg forward / passing pose). Identical outfit/hair/colours. Flat magenta #ff00ff background. Save to tmp/imagegen/char-forge-walk2-source.png"
```
Then:
```
node scripts/keymap.mjs tmp/imagegen/work-forge-source.png       work-forge       --bg=ff00ff
node scripts/keymap.mjs tmp/imagegen/desk-forge-source.png       desk-forge       --bg=ff00ff
node scripts/keymap.mjs tmp/imagegen/char-forge-stand-source.png char-forge-stand --bg=ff00ff
node scripts/keymap.mjs tmp/imagegen/char-forge-walk-source.png  char-forge-walk  --bg=ff00ff
node scripts/keymap.mjs tmp/imagegen/char-forge-walk2-source.png char-forge-walk2 --bg=ff00ff
```

### REX + NOVA — walk2 only (smooth the existing walk cycle)

They already have `char-rex-walk.png` / `char-nova-walk.png` (one stride pose).
Add the opposite-leg passing frame so the engine alternates walk↔walk2.

```
codex exec "Open public/assets/map/char-rex-walk.png (and char-rex-stand.png for the outfit). Generate the SAME REX character in the SECOND walk frame — opposite leg forward / passing pose to pair with char-rex-walk.png for a smooth 2-frame cycle. Identical hair, outfit and cyan colours, same scale/style. Flat magenta #ff00ff background, whole body in frame. Save to tmp/imagegen/char-rex-walk2-source.png"

codex exec "Open public/assets/map/char-nova-walk.png (and char-nova-stand.png for the outfit). Generate the SAME NOVA character in the SECOND walk frame — opposite leg forward / passing pose to pair with char-nova-walk.png for a smooth 2-frame cycle. Identical hair, outfit and cyan colours, same scale/style. Flat magenta #ff00ff background, whole body in frame. Save to tmp/imagegen/char-nova-walk2-source.png"
```
Then:
```
node scripts/keymap.mjs tmp/imagegen/char-rex-walk2-source.png  char-rex-walk2  --bg=ff00ff
node scripts/keymap.mjs tmp/imagegen/char-nova-walk2-source.png char-nova-walk2 --bg=ff00ff
```

## Wiring (already done)

`OFFICE_STATIONS.tech` in `src/components/MapGame.tsx` already has byte/zeta/forge
placed on the front row. The engine falls back to `walk`→`stand` if a frame is
missing, so sprites render as soon as each file lands — generate + key one, the
office picks it up on reload. Tune positions there if needed.
