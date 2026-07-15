/**
 * Pure derivation logic for the character data model — no Foundry dependencies,
 * so it can be unit-tested headlessly and reused by CharacterData.prepareDerivedData.
 * Mutates the given `system` object in place.
 */

import { ABILITIES, SKILLS } from "../config.mjs";

export function deriveCharacter(system) {
  const prof = system.attributes?.prof ?? 2;

  for (const key of Object.keys(ABILITIES)) {
    const a = system.abilities?.[key];
    if (!a) continue;
    a.mod = Math.floor((a.value - 10) / 2);
    a.save = a.mod + (a.proficient ? prof : 0);
  }

  for (const [key, cfg] of Object.entries(SKILLS)) {
    const s = system.skills?.[key];
    if (!s) continue;
    const abilityMod = system.abilities?.[s.ability ?? cfg.ability]?.mod ?? 0;
    s.total = abilityMod + prof * (s.proficient ?? 0);
  }

  const attrs = system.attributes ?? (system.attributes = {});
  attrs.passivePerception = 10 + (system.skills?.prc?.total ?? 0);
  attrs.init = (system.abilities?.dex?.mod ?? 0) + (attrs.initBonus ?? 0);

  const abl = attrs.spellcasting || "int";
  const ablMod = system.abilities?.[abl]?.mod ?? 0;
  attrs.spellDC = 8 + prof + ablMod;
  attrs.spellAtk = prof + ablMod;

  const carried = (system.gear ?? []).reduce((sum, g) => sum + (Number(g.weight) || 0), 0);
  attrs.encumbrance = { value: carried, max: (system.abilities?.str?.value ?? 10) * 15 };
  attrs.attunementUsed = (system.gear ?? []).filter((g) => g.attuned).length;

  return system;
}
