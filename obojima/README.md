# Obojima

A self-contained, Ghibli-flavored **Foundry VTT v14 game system** for the
[Obojima: Tales from the Tall Grass](https://obojima.com/) setting. Its character
sheet is a compact **dashboard**: a full-width band with identity, vitals and
ability scores; a Saves & Skills panel beside a tabbed detail area
(Spells / Features / Inventory / Potions & Spirit / Bio); a status/concentration
popover; and two Obojima-specific panels — **potion brewing** and a
**spirit companion**. The whole sheet fits the default window with no scrolling.

**No dependencies.** This is a standalone system — it does *not* require dnd5e or
any other system/module. You manage one thing.

## Requirements

- **Foundry VTT v14** (verified on 14.363)

## Install (local dev)

Symlink or copy this `obojima/` folder into your Foundry **systems** dir
(the folder name must match the system id `obojima`):

```
~/Library/Application Support/FoundryVTT/Data/systems/obojima
```

e.g. `ln -s "$(pwd)/obojima" "$HOME/Library/Application Support/FoundryVTT/Data/systems/obojima"`

Then in Foundry: **Game Systems** tab → **Create World** → choose **"Obojima"**
as the system → Launch.

## Use

Create a character actor — the Obojima sheet is the default. Toggle the sheet's
**edit mode** (the lock/edit control in the window header) to fill it in.

- **Abilities auto-derive:** enter ability scores and the proficiency bonus; the
  sheet computes modifiers, saving throws, all 18 skill totals, spell save DC &
  attack, passive perception, encumbrance and attunement. Toggle save
  proficiency (the dot by each ability) and skill proficiency (click the skill
  pip to cycle none → proficient → expertise).
- **Rolling:** click any ability, save, skill, initiative, attack, or spell to
  roll `1d20 + modifier` to chat.
- **＋ Status:** conditions + concentration popover (stored on the actor).
- **⤴ Level Up:** bumps level and adds HP (take average or roll the hit die).
- **Potions & Spirit:** edit the larder, add recipes (name / rarity / DC), click
  **Brew** to roll `1d20 + brew bonus` vs the recipe DC; build and edit a spirit
  companion statblock and post its abilities to chat.

Identity text (species, pronouns, alignment, subclass, background, hit die) is
edited on the **Bio** tab.

## Architecture

- **Data model:** `scripts/data/CharacterData.mjs` (a `TypeDataModel`); all
  derived math lives in the Foundry-free `scripts/data/derive.mjs` (unit-tested
  headlessly and reused by `prepareDerivedData`).
- **Sheet:** `scripts/sheets/CharacterSheet.mjs` — an ApplicationV2 `ActorSheetV2`.
  Layout parts in `templates/parts/` (`band`, `prof`, `detail`, `tab-*`).
- **Adapters:** `scripts/helpers.mjs` turns system data into template view-models.
- **Config:** `scripts/config.mjs` (abilities, skills, conditions).
- **Obojima subsystems:** `scripts/data/brewing.mjs`, `scripts/data/spirit.mjs`
  (stored under the actor's `flags.obojima`).
- **Styles:** authored as `styles/partials/*.css`, concatenated via
  `node build-css.mjs` → `styles/obojima.css`. Fonts are self-hosted
  (`node fetch-fonts.mjs`); no CDN, works offline.

> Internal CSS classes / Handlebars helpers use a short `oa-` prefix — purely a
> namespace, not user-facing.

## Status

Feature-complete: the full dashboard sheet over a self-contained data model with
auto-derived math, all rolls, editable content lists, status/concentration,
level-up, and the brewing + spirit subsystems. Planned follow-ups: embedded
Items (drag-and-drop content) and an Obojima ingredient/recipe compendium.
