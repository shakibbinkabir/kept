# Kept brand

**The Keeper ring:** an open ring holding a gem in its gap, the way a setting holds a stone or a locket holds a portrait. It stands for what Kept does: it holds on to what matters.

## Files

| File | Use |
| --- | --- |
| `mark.svg` | The mark on light backgrounds (deep ring, sky gem) |
| `mark-on-dark.svg` | The mark on dark backgrounds (ice ring, sky gem) |
| `mark-small.svg` | Heavier cut for 16–24 px; the gem stays clear of the ring |
| `tile.svg`, `tile-small.svg` | App and toolbar tile: ink square, ice ring, sky gem |
| `wordmark.svg`, `wordmark-on-dark.svg` | "kept", drawn with the same round strokes as the ring |
| `lockup.svg`, `lockup-on-dark.svg` | Mark and wordmark together |
| `promo-440x280.png` | Chrome Web Store small promo tile |
| `og.png` | Social preview for the website |
| `../icons/icon16.png` … `icon256.png` | Extension icons (16 and 32 use the small cut) |
| `../icons/ui.svg` | Interface icons: 24 px grid, 1.75 round strokes, `currentColor` |
| `../styles/tokens.css` | Colour, type, spacing, corner, shadow and motion tokens, light and dark |
| `../fonts/` | Manrope, variable weight, latin and latin-ext (SIL Open Font License) |

Regenerate everything with `node brand/build.mjs` (after `npm i --no-save @resvg/resvg-js`).

## Colour: Ink & sky

| Name | Hex | Role |
| --- | --- | --- |
| Ink | `#1B262C` | Tiles, dark surfaces, text on light |
| Deep | `#0F4C75` | The ring on light, primary actions on light |
| Sky | `#3282B8` | The gem, focus rings, links |
| Ice | `#BBE1FA` | The ring on dark, primary actions on dark |

Flat colour only: no gradients, glows or outlines on the mark.

## Using the mark

- Keep clear space around it equal to the gem's diameter.
- Smallest size: 16 px with `mark-small.svg` or `tile-small.svg`; use the regular cut from 32 px up.
- Don't recolour the gem separately from the palette, rotate the mark, close the ring, or move the gem out of the gap.
- In motion, the gem orbits in and settles into the gap; the ring itself stays still.

Kept is not affiliated with Instagram or Meta; never pair the mark with Instagram's logo or gradient.
