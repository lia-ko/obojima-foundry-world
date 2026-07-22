/**
 * Obojima — shared constants, Handlebars helpers, and view-model adapters.
 *
 * This is a self-contained system: the adapters format the actor's OWN
 * (already-derived) system data for the templates. No external system needed.
 */

import { ABILITIES, SKILLS, CONDITIONS, FEATURE_ACTIONS } from "./config.mjs";
import { CLASSES } from "./data/classes.mjs";
import { ANCESTRIES } from "./data/ancestries.mjs";
import { BACKGROUNDS } from "./data/backgrounds.mjs";

export const SYSTEM_ID = "obojima";
export const SYSTEM_PATH = `systems/${SYSTEM_ID}`;
export const TEMPLATE_PATH = `${SYSTEM_PATH}/templates`;

/** Build a full template path from a path relative to the templates/ dir. */
export const T = (path) => `${TEMPLATE_PATH}/${path}`;

/** All partial + part templates to preload at init. */
export const TEMPLATES = [
  T("sheet.hbs"),
  T("parts/header.hbs"),
  T("parts/band.hbs"),
  T("parts/prof.hbs"),
  T("parts/detail.hbs"),
  T("parts/tab-spells.hbs"),
  T("parts/tab-features.hbs"),
  T("parts/tab-inventory.hbs"),
  T("parts/tab-potions.hbs"),
  T("parts/tab-bio.hbs")
];

/* -------------------------------------------- */
/*  Small formatting utilities                  */
/* -------------------------------------------- */

export function num(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

/** Format a modifier as a signed string, e.g. 3 -> "+3", -1 -> "−1" (true minus). */
export function signed(v) {
  const n = num(v, 0);
  return n >= 0 ? `+${n}` : `−${Math.abs(n)}`;
}

/* -------------------------------------------- */
/*  Handlebars helpers                          */
/* -------------------------------------------- */

export function registerHandlebarsHelpers() {
  const H = Handlebars;
  H.registerHelper("oa-signed", (v) => signed(v));
  H.registerHelper("oa-eq", (a, b) => a === b);
  H.registerHelper("oa-gt", (a, b) => num(a) > num(b));
  H.registerHelper("oa-gte", (a, b) => num(a) >= num(b));
  H.registerHelper("oa-or", (...args) => args.slice(0, -1).some(Boolean));
  H.registerHelper("oa-dots", (value, max) => {
    const m = Math.max(0, num(max));
    const v = Math.max(0, num(value));
    return Array.from({ length: m }, (_, i) => i < v);
  });
  H.registerHelper("oa-range", (n) => Array.from({ length: Math.max(0, num(n)) }, (_, i) => i));
}

/* -------------------------------------------- */
/*  Actor adapters -> view-models               */
/*  (read our own already-derived system data)  */
/* -------------------------------------------- */

export function identityData(actor) {
  const d = actor.system.details ?? {};
  const sub = [d.species, d.pronouns, d.alignment].filter(Boolean).join(" · ");
  const clsDef = CLASSES[d.className];
  const className = clsDef?.label ?? d.className ?? "";
  // Only show a subclass name when it's a valid key for the class — never echo a
  // stray/corrupted stored value.
  const subclass = clsDef?.subclasses?.[d.subclass]?.label ?? "";
  const species = ANCESTRIES[d.ancestry]?.label ?? d.species ?? "";
  const subline2 = [species, d.pronouns, d.alignment].filter(Boolean).join(" · ");
  // Surface an Oaka Mark (elf) as an identity badge, if the character has one.
  const oakaFeat = (actor.system.features ?? []).find((f) => /^Oaka Mark/i.test(f.name ?? ""));
  return {
    name: actor.name,
    img: actor.img,
    species,
    oaka: oakaFeat?.name ?? "",
    subline: subline2,
    alignment: d.alignment ?? "",
    className,
    subclass,
    level: num(d.level, 1),
    background: BACKGROUNDS[d.background]?.label ?? d.background ?? "",
    hitDice: d.level && d.hitDie ? `${num(d.level, 1)}${d.hitDie}` : ""
  };
}

export function coreStats(actor) {
  const a = actor.system.attributes ?? {};
  const hp = a.hp ?? {};
  const hpVal = num(hp.value), hpMax = num(hp.max), hpTemp = num(hp.temp);
  const denom = hpMax + hpTemp;
  return {
    ac: num(a.ac),
    hp: { value: hpVal, max: hpMax, temp: hpTemp },
    hpPct: hpMax > 0 ? Math.max(0, Math.min(100, Math.round((hpVal / hpMax) * 100))) : 0,
    hpTempPct: denom > 0 ? Math.max(0, Math.min(100, Math.round((hpTemp / denom) * 100))) : 0,
    init: signed(a.init),
    speed: num(a.speed),
    prof: num(a.prof),
    passivePerception: num(a.passivePerception)
  };
}

export function abilityRows(actor) {
  const abilities = actor.system.abilities ?? {};
  return Object.entries(ABILITIES).map(([key, cfg]) => {
    const a = abilities[key] ?? {};
    return {
      key,
      label: cfg.abbr,
      value: num(a.value, 10),
      mod: signed(a.mod),
      save: signed(a.save),
      saveProficient: !!a.proficient
    };
  });
}

export function saveSummary(rows) {
  return rows.filter((r) => r.saveProficient).map((r) => `${r.label} ${r.save}`);
}

export function skillRows(actor) {
  const skills = actor.system.skills ?? {};
  return Object.entries(SKILLS).map(([key, cfg]) => {
    const s = skills[key] ?? {};
    const prof = num(s.proficient);
    return {
      key,
      label: cfg.label,
      mod: signed(s.total),
      proficient: prof > 0,
      expertise: prof >= 2,
      ability: (s.ability ?? cfg.ability).toUpperCase()
    };
  });
}

export function spellData(actor) {
  const sys = actor.system;
  const attrs = sys.attributes ?? {};
  const slots = sys.spells ?? {};

  // Group the spell list by level.
  const byLevel = new Map();
  let preparedCount = 0;
  for (const sp of sys.spellList ?? []) {
    const lvl = num(sp.level);
    if (sp.prepared && lvl > 0) preparedCount++;
    if (!byLevel.has(lvl)) byLevel.set(lvl, []);
    byLevel.get(lvl).push(sp);
  }

  const levels = [...byLevel.keys()].sort((a, b) => a - b).map((lvl) => {
    const slot = slots[`spell${lvl}`];
    return {
      level: lvl,
      label: lvl === 0 ? "Cantrips" : ordinal(lvl),
      cantrip: lvl === 0,
      slots: lvl === 0 ? null : slot ? { value: num(slot.value), max: num(slot.max) } : null,
      spells: byLevel.get(lvl).map((s, i) => ({ ...s, index: sys.spellList.indexOf(s) }))
    };
  });

  const slotEditor = [];
  for (let l = 1; l <= 9; l++) {
    const s = slots[`spell${l}`] ?? {};
    slotEditor.push({ level: l, value: num(s.value), max: num(s.max) });
  }

  // Prepared casters (Druid/Wizard) prepare spells = ability modifier + class level.
  const abl = attrs.spellcasting || "int";
  const ablMod = num(sys.abilities?.[abl]?.mod);
  const maxPrepared = Math.max(1, ablMod + num(sys.details?.level, 1));

  return {
    dc: num(attrs.spellDC),
    atk: signed(attrs.spellAtk),
    ability: (attrs.spellcasting ?? "wis").toUpperCase(),
    prepared: preparedCount,
    maxPrepared,
    overPrepared: preparedCount > maxPrepared,
    levels,
    slotEditor,
    list: (sys.spellList ?? []).map((s, index) => ({ ...s, index }))
  };
}

export function featureData(actor) {
  return (actor.system.features ?? []).map((f, index) => ({
    index,
    name: f.name,
    source: f.source ?? "",
    description: f.description ?? "",
    hasUses: num(f.uses?.max) > 0 && num(f.uses?.max) <= 10,
    uses: { value: num(f.uses?.value), max: num(f.uses?.max) },
    recovery: f.recovery ?? "",
    actionable: FEATURE_ACTIONS.has(f.name)
  }));
}

/** Ability modifier used by an attack (str/dex/none, or best of str/dex). */
export function attackAbilityMod(sys, ability) {
  if (ability === "none") return 0;
  if (ability === "best") return Math.max(num(sys.abilities?.str?.mod), num(sys.abilities?.dex?.mod));
  return num(sys.abilities?.[ability ?? "str"]?.mod);
}

export function inventoryData(actor) {
  const sys = actor.system;
  const prof = num(sys.attributes?.prof);
  const gear = (sys.gear ?? []).map((g, index) => ({ index, name: g.name, weight: num(g.weight), attuned: !!g.attuned }));
  const attacks = (sys.attacks ?? []).map((a, index) => {
    const mod = attackAbilityMod(sys, a.ability);
    const manual = (a.toHit ?? "").trim();
    const toHit = manual || signed(mod + (a.proficient ? prof : 0));
    const damage = a.damage ? (mod ? `${a.damage} ${signed(mod)}` : a.damage) : "";
    return { index, name: a.name, ability: a.ability ?? "str", proficient: !!a.proficient, toHit, damage, damageDie: a.damage ?? "" };
  });
  const enc = sys.attributes?.encumbrance ?? {};
  return {
    attacks,
    carried: gear,
    capacity: { value: num(enc.value), max: num(enc.max) },
    attunement: {
      used: num(sys.attributes?.attunementUsed),
      max: num(sys.attributes?.attunementMax, 3),
      items: gear.filter((g) => g.attuned)
    },
    currency: {
      pp: num(sys.currency?.pp), gp: num(sys.currency?.gp),
      sp: num(sys.currency?.sp), cp: num(sys.currency?.cp)
    }
  };
}

export function bioData(actor) {
  const d = actor.system.details ?? {};
  return { ideal: d.ideal ?? "", bond: d.bond ?? "", flaw: d.flaw ?? "", biography: d.biography ?? "" };
}

/** Conditions popover context from the actor's active-conditions list. */
export function statusData(actor) {
  const active = new Set(actor.system.conditions ?? []);
  const conditions = CONDITIONS.map((label) => ({ id: label, label, active: active.has(label) }));
  return { conditions, activeChips: conditions.filter((c) => c.active) };
}

export function concentrationData(actor) {
  const c = actor.system.concentration ?? {};
  return { active: !!c.active, name: c.spell ?? "" };
}

/* -------------------------------------------- */

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
