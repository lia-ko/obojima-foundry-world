/** Obojima — static config: abilities, skills, conditions. */

export const ABILITIES = {
  str: { label: "Strength", abbr: "STR" },
  dex: { label: "Dexterity", abbr: "DEX" },
  con: { label: "Constitution", abbr: "CON" },
  int: { label: "Intelligence", abbr: "INT" },
  wis: { label: "Wisdom", abbr: "WIS" },
  cha: { label: "Charisma", abbr: "CHA" }
};

export const SKILLS = {
  acr: { label: "Acrobatics", ability: "dex" },
  ani: { label: "Animal Handling", ability: "wis" },
  arc: { label: "Arcana", ability: "int" },
  ath: { label: "Athletics", ability: "str" },
  dec: { label: "Deception", ability: "cha" },
  his: { label: "History", ability: "int" },
  ins: { label: "Insight", ability: "wis" },
  itm: { label: "Intimidation", ability: "cha" },
  inv: { label: "Investigation", ability: "int" },
  med: { label: "Medicine", ability: "wis" },
  nat: { label: "Nature", ability: "int" },
  prc: { label: "Perception", ability: "wis" },
  prf: { label: "Performance", ability: "cha" },
  per: { label: "Persuasion", ability: "cha" },
  rel: { label: "Religion", ability: "int" },
  slt: { label: "Sleight of Hand", ability: "dex" },
  ste: { label: "Stealth", ability: "dex" },
  sur: { label: "Survival", ability: "wis" },
  // Obojima's two new skills (First Age tech & crafting)
  mec: { label: "Mechanics", ability: "int" },
  sal: { label: "Salvage", ability: "int" }
};

/** Features with an interactive "Use" button (rolls/applies their effect). */
export const FEATURE_ACTIONS = new Set([
  "Second Wind", "Action Surge", "Sneak Attack", "Channel Essence", "Petal Dance", "An Arcane Art"
]);

/** Conditions available in the status popover. */
export const CONDITIONS = [
  "Blinded", "Charmed", "Deafened", "Frightened", "Grappled", "Incapacitated",
  "Invisible", "Paralyzed", "Petrified", "Poisoned", "Prone", "Restrained",
  "Stunned", "Unconscious"
];
