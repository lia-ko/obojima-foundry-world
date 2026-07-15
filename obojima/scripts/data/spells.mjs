/**
 * Druid & Wizard spell lists, levels 1–3 (standard D&D 5e SRD).
 * Flags: c = concentration, r = ritual.
 */

const S = (name, flags = "") => ({ name, c: flags.includes("C"), r: flags.includes("R") });

export const DRUID_SPELLS = {
  0: [
    S("Druidcraft"), S("Guidance", "C"), S("Mending"), S("Poison Spray"),
    S("Produce Flame"), S("Resistance", "C"), S("Shillelagh"), S("Thorn Whip")
  ],
  1: [
    S("Animal Friendship"), S("Charm Person"), S("Create or Destroy Water"), S("Cure Wounds"),
    S("Detect Magic", "CR"), S("Detect Poison and Disease", "CR"), S("Entangle", "C"), S("Faerie Fire", "C"),
    S("Fog Cloud", "C"), S("Goodberry"), S("Healing Word"), S("Jump"), S("Longstrider"),
    S("Purify Food and Drink", "R"), S("Speak with Animals", "R"), S("Thunderwave")
  ],
  2: [
    S("Animal Messenger", "R"), S("Barkskin", "C"), S("Darkvision"), S("Enhance Ability", "C"),
    S("Find Traps"), S("Flame Blade", "C"), S("Flaming Sphere", "C"), S("Gust of Wind", "C"),
    S("Heat Metal", "C"), S("Hold Person", "C"), S("Lesser Restoration"), S("Locate Animals or Plants", "R"),
    S("Locate Object", "C"), S("Moonbeam", "C"), S("Pass without Trace", "C"), S("Protection from Poison"),
    S("Spike Growth", "C")
  ],
  3: [
    S("Call Lightning", "C"), S("Conjure Animals", "C"), S("Daylight"), S("Dispel Magic"),
    S("Meld into Stone", "R"), S("Plant Growth"), S("Protection from Energy", "C"), S("Sleet Storm", "C"),
    S("Speak with Plants"), S("Water Breathing", "R"), S("Water Walk", "R"), S("Wind Wall", "C")
  ]
};

export const WIZARD_SPELLS = {
  0: [
    S("Acid Splash"), S("Chill Touch"), S("Dancing Lights", "C"), S("Fire Bolt"), S("Light"),
    S("Mage Hand"), S("Mending"), S("Message"), S("Minor Illusion"), S("Poison Spray"),
    S("Prestidigitation"), S("Ray of Frost"), S("Shocking Grasp"), S("True Strike", "C")
  ],
  1: [
    S("Alarm", "R"), S("Burning Hands"), S("Charm Person"), S("Comprehend Languages", "R"),
    S("Detect Magic", "CR"), S("Disguise Self"), S("Expeditious Retreat", "C"), S("False Life"),
    S("Feather Fall"), S("Find Familiar", "R"), S("Fog Cloud", "C"), S("Grease"), S("Identify", "R"),
    S("Illusory Script", "R"), S("Jump"), S("Longstrider"), S("Mage Armor"), S("Magic Missile"),
    S("Protection from Evil and Good", "C"), S("Ray of Sickness"), S("Shield"), S("Silent Image", "C"),
    S("Sleep"), S("Tenser's Floating Disk", "R"), S("Thunderwave"), S("Unseen Servant", "R"), S("Witch Bolt", "C")
  ],
  2: [
    S("Acid Arrow"), S("Alter Self", "C"), S("Arcane Lock"), S("Blindness/Deafness"), S("Blur", "C"),
    S("Continual Flame"), S("Darkness", "C"), S("Darkvision"), S("Detect Thoughts", "C"),
    S("Enlarge/Reduce", "C"), S("Flaming Sphere", "C"), S("Gentle Repose", "R"), S("Gust of Wind", "C"),
    S("Hold Person", "C"), S("Invisibility", "C"), S("Knock"), S("Levitate", "C"), S("Locate Object", "C"),
    S("Magic Mouth", "R"), S("Magic Weapon", "C"), S("Mirror Image"), S("Misty Step"),
    S("Ray of Enfeeblement", "C"), S("Rope Trick"), S("Scorching Ray"), S("See Invisibility"),
    S("Shatter"), S("Spider Climb", "C"), S("Suggestion", "C"), S("Web", "C")
  ],
  3: [
    S("Animate Dead"), S("Bestow Curse", "C"), S("Blink"), S("Clairvoyance", "C"), S("Counterspell"),
    S("Dispel Magic"), S("Fear", "C"), S("Fireball"), S("Fly", "C"), S("Gaseous Form", "C"),
    S("Glyph of Warding"), S("Haste", "C"), S("Hypnotic Pattern", "C"), S("Lightning Bolt"),
    S("Magic Circle"), S("Major Image", "C"), S("Nondetection"), S("Phantom Steed", "R"),
    S("Protection from Energy", "C"), S("Remove Curse"), S("Sending"), S("Sleet Storm", "C"),
    S("Slow", "C"), S("Stinking Cloud", "C"), S("Tongues"), S("Vampiric Touch", "C"), S("Water Breathing", "R")
  ]
};

/** True if the class has an importable spell list. */
export function isCasterClass(classKey) {
  return classKey === "druid" || classKey === "wizard";
}

/** Flat list of a class's spells (levels 1–3) with a `level` field. */
export function spellsForClass(classKey) {
  const src = classKey === "druid" ? DRUID_SPELLS : classKey === "wizard" ? WIZARD_SPELLS : null;
  if (!src) return [];
  const out = [];
  for (const lvl of [0, 1, 2, 3]) for (const s of src[lvl] ?? []) out.push({ ...s, level: lvl });
  return out;
}
