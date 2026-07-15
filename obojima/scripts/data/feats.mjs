/**
 * Obojima feats (PDF p162–165). Recorded as feature cards; simple ability-score
 * increases and skill grants are applied automatically. Complex effects live in
 * the card text.  asi: { ability } fixed | { choose: [...] }.  skills: grant/expertise.
 */

export const FEATS = [
  { name: "Boomerang Expert", desc: "Boomerang damage die becomes a d8; no long-range disadvantage; you auto-catch it after throwing." },
  { name: "Bumbling Fool", desc: "When you fail an ability check and roll ≤ half your level (round up), replace the die with a 15. 3 uses/long rest." },
  { name: "Canden & Moon's Master Cut", prereq: "Beat a master at Canden & Moon's Sword School", desc: "+5 ft speed; reaction on initiative to draw & move half speed and make a melee attack; reaction defensive stance (+5 AC) once/long rest." },
  { name: "Cloud Hopper", desc: "Walk on air up to 5× your prof bonus in feet on your turn; learn Fog Cloud & Gust of Wind, each free once/long rest (INT/WIS/CHA)." },
  { name: "Coven Witch", prereq: "Member of a witches coven", asi: { choose: ["int", "wis"] }, desc: "Learn 2 common/uncommon recipes; learn 2 first-level divination/conjuration/transmutation spells, each free once/long rest." },
  { name: "Forager", asi: { ability: "wis" }, skills: ["sur"], desc: "Proficiency (or expertise) in Survival; forage twice the common/uncommon ingredients." },
  { name: "Freediver", asi: { ability: "con" }, desc: "Swim speed = 2× CON; triple CON mod for holding your breath; resistance to cold damage." },
  { name: "Group Combatant", desc: "Reduce nonmagical b/p/s damage by 2 (min 1); no flanking advantage against you; free movement after provoking one opportunity attack." },
  { name: "Light Foot", desc: "+1 AC without heavy armor; forgo one attack to move half speed; ignore nonmagical difficult terrain; move through hostile creatures' spaces." },
  { name: "Magically Mischievous", skills: ["slt"], desc: "Proficiency (or expertise) in Sleight of Hand; turn a stolen small object invisible (Obscure Object). Prof bonus uses/long rest." },
  { name: "Member of AHA", prereq: "Member of AHA", asi: { ability: "int" }, desc: "Learn the Jolt cantrip + one of Comprehend Languages / Detect Magic / Identify / Illusory Script, free once/long rest (INT)." },
  { name: "Minor Corruption", desc: "+1 AC below half HP; ignore noncostly material components; reaction to negate 3× your level in damage (Constitution-save aftermath). Once/long rest." },
  { name: "Nakudama's Electric Bloodline", prereq: "Nakudama", desc: "Resistance to lightning; electrified finesse/reach tongue strike (1d6 lightning, scales); reaction lightning burst when grappled." },
  { name: "Nakudama's Toxin Bloodline", prereq: "Nakudama", desc: "Resistance to poison; advantage on saves vs. poisoned; spit poison at prof-bonus targets (CON save, 1d8 + prof)." },
  { name: "Postal Knight", prereq: "Member of the Courier Brigade", asi: { choose: ["con", "wis"] }, skills: ["ath", "sur"], desc: "Proficiency in Athletics & Survival; exhaustion doesn't impose disadvantage on ability checks." },
  { name: "Potion Brewer", desc: "Brew using the 2nd-highest ingredient attribute; roll percentile ≤ your level to brew two potions instead of one." },
  { name: "Tellu & Scale's Master Cut", prereq: "Beat a master at Tellu & Scale's Sword School", desc: "Versatile-weapon techniques: one-handed riposte damage on a miss; two-handed knock-prone reaction on a miss." },
  { name: "Toraf & Bolder's Master Cut", prereq: "Beat a master at Toraf & Bolder's Sword School", desc: "Take −5 to a melee attack for a Head / Torso / Leg Strike (impose disadvantage / silence / −10 ft speed)." },
  { name: "Vocalist Arcanist", desc: "After rolling a spell attack or forcing a save, make a CHA (Performance) check (DC 10 + spell level) to double your proficiency for that casting." }
];

export const FEAT_OPTIONS = FEATS.map((f, i) => ({ i, label: f.name }));
