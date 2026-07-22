/**
 * Class builder — applies a class/subclass level's fixed progression to an actor
 * and runs guided prompts for the player choices (skills, fighting style,
 * expertise, channeling option, ASI).
 */

import { CLASSES, HIT_DIE_AVG, HIT_DIE_MAX, profBonus } from "./classes.mjs";
import { spellsForClass } from "./spells.mjs";
import { ANCESTRIES } from "./ancestries.mjs";
import { BACKGROUNDS } from "./backgrounds.mjs";
import { FEATS } from "./feats.mjs";
import { SKILLS, ABILITIES } from "../config.mjs";
import { num, SYSTEM_ID } from "../helpers.mjs";

const ORD = { 0: "Cantrips", 1: "1st", 2: "2nd", 3: "3rd" };

/** Ordinal for a spell level (1st, 2nd, … 9th). */
function ordinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

/** Finesse / ranged weapons that use Dexterity for attacks. */
const DEX_WEAPONS = new Set(["Rapier", "Shortsword", "Dagger", "Dagger (×2)", "Scimitar", "Shortbow", "Longbow", "Light crossbow"]);

const FIGHTING_STYLE_DESC = {
  Archery: "+2 bonus to attack rolls you make with ranged weapons.",
  Defense: "+1 bonus to AC while you wear armor. (Applied to your AC.)",
  Dueling: "+2 damage when wielding a melee weapon in one hand and no other weapon.",
  "Great Weapon Fighting": "Reroll 1s and 2s on damage dice with a two-handed/versatile melee weapon.",
  Protection: "Reaction with a shield to impose disadvantage on an attack against a creature within 5 ft.",
  "Two-Weapon Fighting": "Add your ability modifier to the damage of your off-hand attack."
};

const recoveryLabel = (per) => ({ sr: "short rest", lr: "long rest", day: "day" }[per] ?? "");

/**
 * Read all named controls under a root element into a plain object.
 * Checkboxes → boolean; everything else → value. (Exported for testing.)
 */
export function readFields(root) {
  const out = {};
  // Locate our form container whether `root` is the dialog, contains it, or IS it.
  const scope = root?.querySelector?.(".oa-build-form")
    ?? (root?.classList?.contains?.("oa-build-form") ? root : null)
    ?? (typeof document !== "undefined" ? document.querySelector?.(".oa-build-form") : null);
  scope?.querySelectorAll?.("[name]")?.forEach((el) => {
    out[el.name] = el.type === "checkbox" ? el.checked : el.value;
  });
  return out;
}

/**
 * Generic prompt → returns the field values object, or null if cancelled.
 * Reads values directly from the dialog DOM (DialogV2 buttons are outside the
 * content form, so `button.form` is null and can't be used).
 */
async function promptForm(title, innerHTML, okLabel = "Confirm", width = null) {
  const DV2 = foundry.applications.api.DialogV2;
  const config = {
    window: { title },
    content: `<div class="oa-build-form" style="display:flex;flex-direction:column;gap:8px">${innerHTML}</div>`,
    buttons: [
      { action: "ok", label: okLabel, default: true, callback: (event, button, dialog) => readFields(dialog?.element ?? button?.closest?.(".application, dialog") ?? null) },
      { action: "cancel", label: "Skip", callback: () => null }
    ]
  };
  if (width) config.position = { width };
  const result = await DV2.wait(config).catch((err) => { console.error("Obojima | prompt dialog error:", err); return null; });
  return result === "cancel" || result == null ? null : result;
}

const skillCheckbox = (key, checked = false) =>
  `<label style="display:flex;align-items:center;gap:6px"><input type="checkbox" name="${key}" ${checked ? "checked" : ""}> ${SKILLS[key].label}</label>`;

/** Prompt to choose `count` skills from a list of keys. Returns chosen keys. */
async function chooseSkills(fromKeys, count, title) {
  const boxes = fromKeys.map((k) => skillCheckbox(k)).join("");
  const data = await promptForm(title, `<p style="margin:0;font-size:12px">Choose <b>${count}</b>:</p>${boxes}`);
  if (!data) return [];
  let chosen = Object.keys(data).filter((k) => data[k]);
  if (chosen.length > count) chosen = chosen.slice(0, count);
  return chosen;
}

/** Prompt a single choice from a list of strings via a select. Returns the value. */
async function chooseOne(title, label, options) {
  const opts = options.map((o) => `<option value="${o}">${o}</option>`).join("");
  const data = await promptForm(title, `<label style="display:flex;flex-direction:column;gap:3px">${label}<select name="choice">${opts}</select></label>`);
  return data?.choice ?? null;
}

/** Prompt a single choice from labelled options; returns the chosen index (or null). */
async function chooseOption(title, label, optionLabels) {
  const opts = optionLabels.map((o, i) => `<option value="${i}">${o}</option>`).join("");
  const data = await promptForm(title, `<label style="display:flex;flex-direction:column;gap:3px">${label}<select name="choice">${opts}</select></label>`);
  if (!data) return null;
  const i = Number(data.choice);
  return Number.isInteger(i) ? i : null;
}

/** Add a class's starting equipment to the inventory, prompting for each choice. */
async function promptEquipment(actor, cls) {
  const groups = cls.startingEquipment ?? [];
  if (!groups.length) return;
  const gear = [...(actor.system.gear ?? [])];
  const attacks = [...(actor.system.attacks ?? [])];
  const addItem = (it) => {
    if (!gear.some((g) => g.name === it.name)) gear.push({ name: it.name, weight: num(it.weight), attuned: false });
    if (it.dmg && !attacks.some((a) => a.name === it.name)) {
      attacks.push({ name: it.name, ability: DEX_WEAPONS.has(it.name) ? "dex" : "str", proficient: true, damage: it.dmg, toHit: "" });
    }
  };
  for (const group of groups) {
    if (group.fixed) { group.fixed.forEach(addItem); continue; }
    const idx = await chooseOption("Starting Equipment", `${group.label}:`, group.options.map((o) => o.label));
    (group.options[idx ?? 0]?.items ?? []).forEach(addItem);
  }
  await actor.update({ "system.gear": gear, "system.attacks": attacks });
}

/**
 * Advance the actor one class level (up to 5), applying fixed progression and
 * running guided prompts. Returns the new level, or null if it couldn't run.
 */
export async function levelUp(actor) {
  const d = actor.system.details ?? {};
  const classKey = d.className;
  const cls = CLASSES[classKey];
  if (!cls) {
    ui.notifications?.warn("Pick a class from the dropdown before leveling up.");
    return null;
  }
  const built = num(d.builtLevel);
  if (built >= 5) {
    ui.notifications?.info("This builder covers levels 1–5; you're already at 5.");
    return null;
  }
  const level = built + 1;
  const subKey = d.subclass;
  const sub = cls.subclasses?.[subKey];

  // --- Fixed progression: accumulate one update ---
  const update = {};
  const sys = actor.system;
  const conMod = sys.abilities?.con?.mod ?? 0;

  update["system.attributes.prof"] = profBonus(level);
  update["system.details.hitDie"] = cls.hitDie;
  update["system.details.level"] = level;
  update["system.details.builtLevel"] = level;

  // Saves + proficiencies (set at level 1)
  if (level === 1) {
    for (const ab of cls.saves) update[`system.abilities.${ab}.proficient`] = true;
    update["system.proficiencies.armor"] = cls.armor ?? "";
    update["system.proficiencies.weapons"] = cls.weapons ?? "";
    update["system.proficiencies.tools"] = cls.tools ?? "";
  }

  // HP
  if (level === 1) {
    const hp = (HIT_DIE_MAX[cls.hitDie] ?? 8) + conMod;
    update["system.attributes.hp.max"] = hp;
    update["system.attributes.hp.value"] = hp;
  } else {
    const gain = Math.max(1, (HIT_DIE_AVG[cls.hitDie] ?? 5) + conMod);
    update["system.attributes.hp.max"] = num(sys.attributes?.hp?.max) + gain;
    update["system.attributes.hp.value"] = num(sys.attributes?.hp?.value) + gain;
  }

  // Spell slots (full casters)
  if (cls.caster === "full") {
    update["system.attributes.spellcasting"] = cls.spellAbility;
    const table = cls.slots[level] ?? {};
    for (let l = 1; l <= 9; l++) {
      const max = table[l] ?? 0;
      update[`system.spells.spell${l}.max`] = max;
      update[`system.spells.spell${l}.value`] = max;
    }
  }

  // Features (class + subclass), deduped by name
  const feats = [...(cls.features?.[level] ?? [])].map((f) => ({ ...f, source: cls.label }));
  if (sub && level >= cls.subclassLevel) {
    for (const f of sub.features?.[level] ?? []) feats.push({ ...f, source: sub.label });
  }
  const existing = new Set((sys.features ?? []).map((f) => f.name));
  const additions = feats
    .filter((f) => !existing.has(f.name))
    .map((f) => ({
      name: f.name, source: f.source, description: f.desc,
      uses: { value: num(f.uses?.max), max: num(f.uses?.max) },
      recovery: recoveryLabel(f.uses?.per)
    }));
  if (additions.length) update["system.features"] = [...(sys.features ?? []), ...additions];

  // Subclass-granted spells (e.g. Origami Familiar → Find Familiar, always prepared)
  if (sub && level >= cls.subclassLevel && sub.grantedSpells?.[level]) {
    const haveSpells = new Set((sys.spellList ?? []).map((s) => s.name));
    const spellAdds = sub.grantedSpells[level]
      .filter((s) => !haveSpells.has(s.name))
      .map((s) => ({ name: s.name, level: num(s.level), prepared: s.prepared !== false, concentration: !!s.concentration, ritual: !!s.ritual }));
    if (spellAdds.length) update["system.spellList"] = [...(sys.spellList ?? []), ...spellAdds];
  }

  await actor.update(update);

  // --- Guided prompts (applied as follow-up updates) ---
  console.log(`Obojima [v0.4] | running level-${level} guided prompts for ${cls.label}`);
  // Each is isolated so one failing prompt can't silently abort the rest, and any
  // error surfaces in the console for diagnosis.
  const safe = async (fn, label) => { try { await fn(); } catch (err) { console.error(`Obojima | ${label} prompt failed:`, err); ui.notifications?.error(`Obojima: the "${label}" step errored — see console (F12).`); } };
  if (level === 1) await safe(() => promptLevel1(actor, cls), "skill/style");
  if (level === 1) await safe(() => promptEquipment(actor, cls), "equipment");
  if (subKey && sub && level === cls.subclassLevel) await safe(() => promptSubclass(actor, classKey, sub), "subclass");
  if (cls.asiLevels?.includes(level)) await safe(() => promptASI(actor), "ability score improvement");

  ui.notifications?.info(`${cls.label} advanced to level ${level}.`);
  return level;
}

/** Level-1 choices: skills, expertise (rogue), fighting style (fighter). */
async function promptLevel1(actor, cls) {
  const chosen = await chooseSkills(cls.skills.from, cls.skills.choose, `${cls.label}: choose skill proficiencies`);
  const upd = {};
  for (const k of chosen) upd[`system.skills.${k}.proficient`] = 1;
  if (Object.keys(upd).length) await actor.update(upd);

  if (cls.expertise) {
    const profSkills = Object.keys(SKILLS).filter((k) => num(actor.system.skills[k]?.proficient) >= 1);
    const exp = await chooseSkills(profSkills, cls.expertise, `${cls.label}: choose Expertise`);
    const e = {};
    for (const k of exp) e[`system.skills.${k}.proficient`] = 2;
    if (Object.keys(e).length) await actor.update(e);
  }

  if (cls.fightingStyles) {
    const style = await chooseOne(`${cls.label}: Fighting Style`, "Choose a fighting style:", cls.fightingStyles);
    if (style) {
      await appendFeature(actor, { name: `Fighting Style: ${style}`, source: cls.label, description: FIGHTING_STYLE_DESC[style] ?? "Your chosen fighting style." });
      if (style === "Defense") await actor.update({ "system.attributes.ac": num(actor.system.attributes?.ac) + 1 });
    }
  }
}

/** Subclass-level choices (fighter channeling option). */
async function promptSubclass(actor, classKey, sub) {
  if (sub.channeling) {
    const opt = await chooseOne(`${sub.label}: Object Channeling`, "Choose a Channeling Option:", sub.channeling);
    if (opt) await appendFeature(actor, { name: `Channeling: ${opt}`, source: sub.label, description: `Your chosen Object Channeling option.` });
  }
}

/** Ability Score Improvement at level 4. */
async function promptASI(actor) {
  const abilOptions = Object.entries(ABILITIES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");
  const data = await promptForm(
    "Ability Score Improvement",
    `<label style="display:flex;flex-direction:column;gap:3px">Choose:
       <select name="mode"><option value="one">+2 to one ability</option><option value="two">+1 to two abilities</option><option value="feat">Take a feat (note only)</option></select></label>
     <label style="display:flex;flex-direction:column;gap:3px">Ability A <select name="a">${abilOptions}</select></label>
     <label style="display:flex;flex-direction:column;gap:3px">Ability B <select name="b">${abilOptions}</select></label>`,
    "Apply"
  );
  if (!data) return;
  if (data.mode === "feat") {
    await appendFeature(actor, { name: "Feat (choose one)", source: "Level 4", description: "You gained a feat — add its details manually." });
    return;
  }
  const upd = {};
  const cur = (k) => num(actor.system.abilities[k]?.value, 10);
  if (data.mode === "one") {
    upd[`system.abilities.${data.a}.value`] = cur(data.a) + 2;
  } else {
    upd[`system.abilities.${data.a}.value`] = cur(data.a) + 1;
    if (data.b !== data.a) upd[`system.abilities.${data.b}.value`] = cur(data.b) + 1;
    else upd[`system.abilities.${data.a}.value`] = cur(data.a) + 2;
  }
  await actor.update(upd);
}

/**
 * Open a picker of the character's class spell list (levels 1–3) and add the
 * chosen spells to the actor's spell list (concentration/ritual flags set).
 */
export async function pickSpells(actor) {
  const classKey = actor.system.details?.className;
  const list = spellsForClass(classKey);
  if (!list.length) {
    ui.notifications?.info("This class doesn't have an importable spell list (Druid and Wizard only).");
    return;
  }
  const have = new Set((actor.system.spellList ?? []).map((s) => s.name));
  const avail = list.filter((s) => !have.has(s.name));
  if (!avail.length) {
    ui.notifications?.info("You already have every level 1–3 spell from this list.");
    return;
  }

  let sections = "";
  for (const lvl of [0, 1, 2, 3]) {
    const group = avail.filter((s) => s.level === lvl);
    if (!group.length) continue;
    const header = lvl === 0 ? "Cantrips" : `${ORD[lvl]} Level`;
    const items = group.map((s) => {
      const flags = `${s.c ? ' <span style="color:#c4870f;font-weight:700">C</span>' : ""}${s.r ? ' <span style="color:#2c3f35;font-weight:700">R</span>' : ""}`;
      return `<label style="display:flex;align-items:center;gap:7px;font-size:13px;padding:3px 6px;border-radius:6px;cursor:pointer"><input type="checkbox" name="i${list.indexOf(s)}" style="width:15px;height:15px;flex:none"><span>${s.name}${flags}</span></label>`;
    }).join("");
    sections += `<div style="font-weight:800;color:#c4870f;font-size:12px;letter-spacing:.04em;text-transform:uppercase;margin:10px 0 3px">${header}</div>`
      + `<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 14px">${items}</div>`;
  }
  const html = `<p style="margin:0 0 4px;font-size:11px;opacity:.7">Tick the spells to add (C = concentration, R = ritual), then Add.</p>`
    + `<div style="max-height:52vh;overflow-y:auto;padding-right:4px">${sections}</div>`;

  const data = await promptForm(`Add ${CLASSES[classKey].label} Spells`, html, "Add selected", 560);
  if (!data) return;
  const additions = Object.keys(data)
    .filter((k) => data[k] && /^i\d+$/.test(k))
    .map((k) => list[Number(k.slice(1))])
    .filter(Boolean)
    .map((s) => ({ name: s.name, level: s.level, prepared: false, concentration: !!s.c, ritual: !!s.r }));
  if (!additions.length) return;
  await actor.update({ "system.spellList": [...(actor.system.spellList ?? []), ...additions] });
  ui.notifications?.info(`Added ${additions.length} spell${additions.length === 1 ? "" : "s"}.`);
}

const POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

/** Guided ability-score setup: standard array, 4d6-drop-lowest roll, or point buy. */
export async function generateAbilityScores(actor) {
  const keys = Object.keys(ABILITIES);
  const method = await foundry.applications.api.DialogV2.wait({
    window: { title: "Ability Scores" },
    content: `<p style="font-size:12px;margin:0">How would you like to set your six ability scores?</p>`,
    buttons: [
      { action: "array", label: "Standard Array", default: true, callback: () => "array" },
      { action: "roll", label: "Roll 4d6", callback: () => "roll" },
      { action: "pointbuy", label: "Point Buy", callback: () => "pointbuy" },
      { action: "cancel", label: "Cancel", callback: () => "cancel" }
    ]
  }).catch((err) => { console.error("Obojima | ability-score dialog error:", err); return "cancel"; });
  if (!method || method === "cancel") return;

  const row = (k, i, options, selValue) =>
    `<label style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px">${ABILITIES[k].label}
       <select name="${k}">${options.map((v) => `<option value="${v}"${v === selValue(k, i) ? " selected" : ""}>${v}</option>`).join("")}</select></label>`;

  if (method === "pointbuy") {
    const opts = [8, 9, 10, 11, 12, 13, 14, 15];
    const rows = keys.map((k) => row(k, 0, opts, () => 8)).join("");
    const info = `<p style="font-size:11px;opacity:.75;margin:0">Each score 8–15. Costs: 8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9. Budget: <b>27</b> points.</p>`;
    const data = await promptForm("Point Buy (27 points)", `${info}${rows}`, "Apply");
    if (!data) return;
    let cost = 0; const vals = {};
    for (const k of keys) { const v = num(data[k], 8); vals[k] = v; cost += POINT_COST[v] ?? 0; }
    if (cost > 27) {
      ui.notifications?.warn(`Point buy uses ${cost} points, but the budget is 27. Lower some scores and try again.`);
      return;
    }
    const upd = {};
    for (const k of keys) upd[`system.abilities.${k}.value`] = vals[k];
    await actor.update(upd);
    ui.notifications?.info(`Ability scores set — point buy (${cost}/27 points used).`);
    return;
  }

  let values;
  if (method === "array") values = [15, 14, 13, 12, 10, 8];
  else {
    values = [];
    for (let i = 0; i < 6; i++) values.push((await new Roll("4d6kh3").evaluate()).total);
    values.sort((a, b) => b - a);
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<b>${actor.name} — rolled ability scores:</b> ${values.join(", ")}` });
  }
  const rows = keys.map((k, i) => row(k, i, values, (_k, idx) => values[idx])).join("");
  const data = await promptForm(`Assign scores: ${values.join(", ")}`, `<p style="font-size:11px;opacity:.7;margin:0">Assign each value to an ability.</p>${rows}`, "Apply");
  if (!data) return;
  const upd = {};
  for (const k of keys) upd[`system.abilities.${k}.value`] = num(data[k], 10);
  await actor.update(upd);
  ui.notifications?.info("Ability scores set.");
}

/* -------------------------------------------- */
/*  Ancestry / Background / Feats               */
/* -------------------------------------------- */

async function addTraitCards(actor, traits, source) {
  const existing = new Set((actor.system.features ?? []).map((f) => f.name));
  const adds = traits.filter((t) => !existing.has(t.name)).map((t) => ({
    name: t.name, source, description: t.desc, uses: { value: 0, max: 0 }, recovery: ""
  }));
  if (adds.length) await actor.update({ "system.features": [...(actor.system.features ?? []), ...adds] });
}

async function promptAncestryASI(actor, a) {
  const cur = (k) => num(actor.system.abilities[k]?.value, 10);
  if (a.asi.type === "all1") {
    const upd = {};
    for (const k of Object.keys(ABILITIES)) upd[`system.abilities.${k}.value`] = cur(k) + 1;
    await actor.update(upd);
    return;
  }
  const opts = Object.entries(ABILITIES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");
  const data = await promptForm(`${a.label}: ability increases`,
    `<label style="display:flex;flex-direction:column;gap:3px">+2 to <select name="two">${opts}</select></label>
     <label style="display:flex;flex-direction:column;gap:3px">+1 to <select name="one">${opts}</select></label>`, "Apply");
  if (!data) return;
  const upd = {};
  upd[`system.abilities.${data.two}.value`] = cur(data.two) + 2;
  if (data.one !== data.two) upd[`system.abilities.${data.one}.value`] = cur(data.one) + 1;
  else upd[`system.abilities.${data.two}.value`] = cur(data.two) + 3;
  await actor.update(upd);
}

async function promptAncestryVariant(actor, a) {
  const v = a.variants;
  const idx = await chooseOption(`${a.label}: ${v.prompt}`, "Choose your variant:", v.options.map((o) => o.label));
  if (idx == null) return; // cancelled — don't silently default to the first option
  const opt = v.options[idx];
  if (!opt) return;
  // Switching variant: drop any other variant's talisman card so it doesn't linger.
  const otherNames = v.options.filter((o) => o !== opt).map((o) => o.trait?.name).filter(Boolean);
  if (otherNames.length) {
    const cur = actor.system.features ?? [];
    const pruned = cur.filter((f) => !otherNames.includes(f.name));
    if (pruned.length !== cur.length) await actor.update({ "system.features": pruned });
  }
  if (opt.speed != null) await actor.update({ "system.attributes.speed": opt.speed });
  if (opt.trait) await addTraitCards(actor, [opt.trait], a.label);
}

async function promptOakaMark(actor, a) {
  const idx = await chooseOption(`${a.label}: Oaka Mark`, "Choose your Oaka Mark:", a.oakaMark.map((o) => o.label));
  const mark = a.oakaMark[idx ?? 0];
  if (!mark) return;
  const have = new Set((actor.system.spellList ?? []).map((s) => s.name));
  if (!have.has(mark.cantrip)) {
    await actor.update({ "system.spellList": [...(actor.system.spellList ?? []), { name: mark.cantrip, level: 0, prepared: true, concentration: false, ritual: false }] });
  }
  await appendFeature(actor, { name: `Oaka Mark: ${mark.label}`, source: a.label, description: `You know ${mark.cantrip}; at 3rd level you can cast ${mark.spell} once per long rest (Charisma).` });
}

/** Apply a chosen ancestry: speed, ASI, skills (Dara), languages, traits, Oaka Mark. */
export async function applyAncestry(actor) {
  const a = ANCESTRIES[actor.system.details?.ancestry];
  if (!a) { ui.notifications?.warn("Pick an ancestry first."); return; }
  const key = actor.system.details?.ancestry;
  const applied = actor.getFlag(SYSTEM_ID, "ancestryApplied");

  // Speed, languages, and trait cards are safe to (re)apply — they dedupe.
  const upd = { "system.attributes.speed": a.speed };
  const langs = ["Common"];
  if (Array.isArray(a.languages)) langs.push(...a.languages);
  else if (a.languages) langs.push(`+${a.languages} of choice`);
  upd["system.proficiencies.languages"] = [...new Set([...(actor.system.proficiencies?.languages ?? "").split(", ").filter(Boolean), ...langs])].join(", ");
  await actor.update(upd);
  await addTraitCards(actor, a.traits ?? [], a.label);

  // Ability increases and skill grants must apply ONCE — re-running would
  // permanently stack (+2/+1 → +4/+2). Guard on a stored flag. On a repeat of
  // the same ancestry, still let the player re-pick a variant (e.g. Dara colour),
  // but never re-apply the scores.
  if (applied === key) {
    if (a.variants) await promptAncestryVariant(actor, a);
    ui.notifications?.info(`${a.label} already applied — ability scores left unchanged.`);
    return;
  }
  if (applied && applied !== key) {
    ui.notifications?.warn(`Ancestry changed after a previous apply — earlier ability increases were not reverted; adjust scores manually if needed.`);
  }

  await promptAncestryASI(actor, a);
  if (a.skills) {
    const chosen = await chooseSkills(Object.keys(SKILLS), a.skills, `${a.label}: choose ${a.skills} skills`);
    const s = {}; chosen.forEach((k) => (s[`system.skills.${k}.proficient`] = 1));
    if (Object.keys(s).length) await actor.update(s);
  }
  if (a.variants) await promptAncestryVariant(actor, a);
  if (a.oakaMark) await promptOakaMark(actor, a);
  await actor.setFlag(SYSTEM_ID, "ancestryApplied", key);
  ui.notifications?.info(`${a.label} traits applied.`);
}

/** Apply a chosen background: skills, tools, languages, equipment, feature, gold. */
export async function applyBackground(actor) {
  const b = BACKGROUNDS[actor.system.details?.background];
  if (!b) { ui.notifications?.warn("Pick a background first."); return; }
  const upd = {};
  for (const s of b.skills) upd[`system.skills.${s}.proficient`] = Math.max(1, num(actor.system.skills[s]?.proficient));
  if (b.tools) upd["system.proficiencies.tools"] = [actor.system.proficiencies?.tools, b.tools].filter(Boolean).join(", ");
  if (b.languages) upd["system.proficiencies.languages"] = [actor.system.proficiencies?.languages, b.languages].filter(Boolean).join(", ");
  const gear = [...(actor.system.gear ?? [])];
  for (const it of b.equipment ?? []) if (!gear.some((g) => g.name === it.name)) gear.push({ name: it.name, weight: num(it.weight), attuned: false });
  upd["system.gear"] = gear;
  if (b.gold) upd["system.currency.gp"] = num(actor.system.currency?.gp) + b.gold;
  await actor.update(upd);
  if (b.feature) await appendFeature(actor, { name: b.feature.name, source: b.label, description: b.feature.desc });
  ui.notifications?.info(`${b.label} background applied.`);
}

/** Pick a feat: apply simple ASI/skill grants, record the feat as a card. */
export async function pickFeat(actor) {
  const idx = await chooseOption("Add a Feat", "Choose a feat:", FEATS.map((f) => f.name));
  if (idx == null) return;
  const feat = FEATS[idx];
  const upd = {};
  const cur = (k) => num(actor.system.abilities[k]?.value, 10);
  if (feat.asi?.ability) upd[`system.abilities.${feat.asi.ability}.value`] = cur(feat.asi.ability) + 1;
  else if (feat.asi?.choose) {
    const ci = await chooseOption(feat.name, "Increase which ability by 1?", feat.asi.choose.map((k) => ABILITIES[k].label));
    const ab = feat.asi.choose[ci ?? 0];
    upd[`system.abilities.${ab}.value`] = cur(ab) + 1;
  }
  for (const s of feat.skills ?? []) upd[`system.skills.${s}.proficient`] = num(actor.system.skills[s]?.proficient) >= 1 ? 2 : 1;
  if (Object.keys(upd).length) await actor.update(upd);
  await appendFeature(actor, { name: `Feat: ${feat.name}`, source: "Feat", description: (feat.prereq ? `(Prereq: ${feat.prereq}) ` : "") + feat.desc });
  ui.notifications?.info(`Feat added: ${feat.name}.`);
}

/* -------------------------------------------- */
/*  Interactive feature powers                  */
/* -------------------------------------------- */

const ARCANE_CONSTRUCTS = [
  "Bird — gain Perception prof; +2 damage on ranged hits",
  "Cat — gain Stealth prof; extra 1d6 (→1d8 at 5th) melee spell attack",
  "Crab — +1 AC and Athletics prof",
  "Dragon — takes 1d4 fire/turn; 2d6 fire burst when destroyed",
  "Frog — gain Acrobatics prof; reaction to boost a failed Dex save"
];

/** Perform a feature's interactive effect (rolls, applies, expends a use). */
export async function useFeature(actor, index) {
  const feats = actor.system.features ?? [];
  const f = feats[index];
  if (!f) return;
  const sys = actor.system;
  const speaker = ChatMessage.getSpeaker({ actor });
  const level = num(sys.details?.level, 1);
  const expend = async (i = index) => {
    const arr = foundry.utils.duplicate(actor.system.features ?? []);
    if (arr[i] && num(arr[i].uses?.max) > 0) {
      arr[i].uses.value = Math.max(0, num(arr[i].uses.value) - 1);
      await actor.update({ "system.features": arr });
    }
  };

  switch (f.name) {
    case "Second Wind": {
      const r = await new Roll(`1d10 + ${level}`).evaluate();
      await r.toMessage({ speaker, flavor: "Second Wind" });
      await actor.update({ "system.attributes.hp.value": Math.min(num(sys.attributes?.hp?.max), num(sys.attributes?.hp?.value) + r.total) });
      await expend();
      break;
    }
    case "Action Surge":
      await ChatMessage.create({ speaker, content: "<strong>Action Surge</strong> — take one additional action this turn." });
      await expend();
      break;
    case "Sneak Attack": {
      const dice = Math.ceil(level / 2); // 1d6 @1–2, 2d6 @3–4, 3d6 @5
      const r = await new Roll(`${dice}d6`).evaluate();
      await r.toMessage({ speaker, flavor: `Sneak Attack (${dice}d6)` });
      break;
    }
    case "Channel Essence": {
      const r = await new Roll("1d6").evaluate();
      await r.toMessage({ speaker, flavor: "Channel Essence — add to an attack or its damage" });
      await expend();
      break;
    }
    case "Petal Dance": {
      const dice = level >= 5 ? 2 : 1; // 1d6 @2–4, 2d6 @5
      const hit = await new Roll(`1d20 + ${num(sys.attributes?.spellAtk)}`).evaluate();
      await hit.toMessage({ speaker, flavor: "Petal Dance — lunge (ranged spell attack)" });
      const dmg = await new Roll(`${dice}d6`).evaluate();
      await dmg.toMessage({ speaker, flavor: `Petal Dance — ${dice}d6 slashing` });
      const wsIdx = feats.findIndex((x) => x.name === "Wild Shape"); // costs a Wild Shape use
      if (wsIdx >= 0) await expend(wsIdx);
      break;
    }
    case "An Arcane Art": {
      const idx = await chooseOption("An Arcane Art", "Fold which origami construct?", ARCANE_CONSTRUCTS);
      if (idx == null) return;
      await ChatMessage.create({ speaker, content: `<div class="oa-spell-chat"><strong>Origami construct</strong> · ${ARCANE_CONSTRUCTS[idx]}</div>` });
      await expend();
      break;
    }
    default:
      await expend();
  }
}

/* -------------------------------------------- */
/*  Casting                                     */
/* -------------------------------------------- */

/**
 * Cast a spell: cantrips just post; leveled spells prompt for a slot level
 * (allowing upcasting), deduct the slot, and start concentration. Ritual spells
 * offer a no-slot cast.
 */
export async function castSpell(actor, spell) {
  const sys = actor.system;
  const lvl = num(spell.level);
  const speaker = ChatMessage.getSpeaker({ actor });
  const post = async (note) => {
    if (spell.concentration) await actor.update({ "system.concentration": { active: true, spell: spell.name } });
    await ChatMessage.create({ speaker, content: `<div class="oa-spell-chat"><strong>${spell.name}</strong> <span class="oa-muted">· ${note}${spell.ritual ? " · Ritual" : ""}</span></div>` });
  };

  if (lvl === 0) { await post("Cantrip"); return; }

  const buttons = [];
  for (let L = lvl; L <= 9; L++) {
    const slot = sys.spells?.[`spell${L}`];
    if (num(slot?.max) > 0 && num(slot?.value) > 0) buttons.push({ action: `L${L}`, label: `${ordinal(L)} slot (${num(slot.value)}/${num(slot.max)})` });
  }
  if (spell.ritual) buttons.push({ action: "ritual", label: "Ritual (no slot)" });
  if (!buttons.length && !spell.ritual) buttons.push({ action: "noslot", label: "Cast without a slot" });
  buttons.push({ action: "cancel", label: "Cancel" });
  for (const b of buttons) b.callback = () => b.action; // guarantee wait() resolves to the action

  const choice = await foundry.applications.api.DialogV2.wait({
    window: { title: `Cast ${spell.name}` },
    content: `<p style="font-size:12px;margin:0">${spell.name} — ${ordinal(lvl)} level${spell.concentration ? " · concentration" : ""}. Choose a slot:</p>`,
    buttons
  }).catch((err) => { console.error("Obojima | cast dialog error:", err); return "cancel"; });
  if (!choice || choice === "cancel") return;

  if (choice.startsWith("L")) {
    const L = Number(choice.slice(1));
    await actor.update({ [`system.spells.spell${L}.value`]: Math.max(0, num(sys.spells[`spell${L}`].value) - 1) });
    await post(`Cast at ${ordinal(L)} level`);
  } else if (choice === "ritual") {
    await post("Cast as ritual");
  } else {
    await post("Cast");
  }
}

/* -------------------------------------------- */
/*  Rests                                       */
/* -------------------------------------------- */

/** Long rest: full HP, all spell slots, all feature uses, drop concentration. */
export async function longRest(actor) {
  const sys = actor.system;
  const upd = {
    "system.attributes.hp.value": num(sys.attributes?.hp?.max),
    "system.attributes.hp.temp": 0,
    "system.concentration.active": false
  };
  for (let l = 1; l <= 9; l++) upd[`system.spells.spell${l}.value`] = num(sys.spells?.[`spell${l}`]?.max);
  upd["system.features"] = (sys.features ?? []).map((f) => ({ ...f, uses: { value: num(f.uses?.max), max: num(f.uses?.max) } }));
  await actor.update(upd);
  ui.notifications?.info("Long rest — HP, spell slots, and feature uses restored.");
}

/** Short rest: restore short-rest feature uses, then optionally spend Hit Dice to heal. */
export async function shortRest(actor) {
  const sys = actor.system;
  await actor.update({
    "system.features": (sys.features ?? []).map((f) => f.recovery === "short rest"
      ? { ...f, uses: { value: num(f.uses?.max), max: num(f.uses?.max) } } : f)
  });
  const die = num(String(sys.details?.hitDie ?? "d8").replace("d", ""), 8);
  const conMod = num(sys.abilities?.con?.mod);
  const level = num(sys.details?.level, 1);
  const data = await promptForm("Short Rest — Hit Dice",
    `<label style="display:flex;flex-direction:column;gap:3px">Spend how many Hit Dice to heal (${sys.details?.hitDie ?? "d8"} + CON, up to ${level})?
       <input type="number" name="n" value="0" min="0" max="${level}"></label>`, "Rest");
  let healed = 0;
  const n = data ? Math.max(0, Math.min(level, num(data.n))) : 0;
  if (n > 0) {
    const r = await new Roll(`${n}d${die} + ${n * conMod}`).evaluate();
    healed = Math.max(0, r.total);
    await r.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `Short rest — spent ${n} Hit Dice` });
    await actor.update({ "system.attributes.hp.value": Math.min(num(sys.attributes?.hp?.max), num(sys.attributes?.hp?.value) + healed) });
  }
  ui.notifications?.info(`Short rest complete${healed ? ` (+${healed} HP)` : ""}.`);
}

/** Wizard Arcane Recovery: on a short rest, recover slots totaling ≤ half wizard
 *  level (rounded up), none above 5th. */
export async function arcaneRecovery(actor) {
  const sys = actor.system;
  if (sys.details?.className !== "wizard") { ui.notifications?.warn("Arcane Recovery is a Wizard feature."); return; }
  const budget = Math.ceil(num(sys.details?.level, 1) / 2);
  const rows = [];
  for (let L = 1; L <= 5; L++) {
    const slot = sys.spells?.[`spell${L}`];
    const expended = num(slot?.max) - num(slot?.value);
    if (num(slot?.max) > 0 && expended > 0) rows.push({ L, expended });
  }
  if (!rows.length) { ui.notifications?.info("No expended spell slots (1st–5th) to recover."); return; }
  const html = `<p style="font-size:11px;margin:0;opacity:.8">Recover slots totaling up to <b>${budget}</b> slot levels (none above 5th).</p>` +
    rows.map((r) => `<label style="display:flex;justify-content:space-between;gap:8px;font-size:12px">${ordinal(r.L)} slots (up to ${r.expended}) <input type="number" name="L${r.L}" value="0" min="0" max="${r.expended}"></label>`).join("");
  const data = await promptForm("Arcane Recovery", html, "Recover");
  if (!data) return;
  let total = 0; const upd = {};
  for (const r of rows) {
    const n = Math.max(0, Math.min(r.expended, num(data[`L${r.L}`])));
    total += n * r.L;
    if (n > 0) upd[`system.spells.spell${r.L}.value`] = num(sys.spells[`spell${r.L}`].value) + n;
  }
  if (total > budget) { ui.notifications?.warn(`That totals ${total} slot levels but your budget is ${budget}. Nothing recovered.`); return; }
  if (Object.keys(upd).length) await actor.update(upd);
  ui.notifications?.info(`Arcane Recovery — recovered ${total} slot level${total === 1 ? "" : "s"}.`);
}

async function appendFeature(actor, feat) {
  const features = [...(actor.system.features ?? [])];
  if (features.some((f) => f.name === feat.name)) return;
  features.push({ name: feat.name, source: feat.source ?? "", description: feat.description ?? "", uses: { value: 0, max: 0 }, recovery: "" });
  await actor.update({ "system.features": features });
}
