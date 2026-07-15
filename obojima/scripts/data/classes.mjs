/**
 * Class + subclass definitions for the Obojima builder, levels 1–5.
 * Base classes are standard D&D 5e; subclasses are from the Obojima book
 * (Circle of the Petal, Origami Mage, The Spirit-Fused) plus 5e Swashbuckler.
 *
 * Feature shape: { name, desc, uses?: { max, per } }
 * per: "sr" (short rest) | "lr" (long rest) | "day"
 */

/** Full-caster spell-slot table by character level (levels 1–5). */
const FULL_SLOTS = {
  1: { 1: 2 },
  2: { 1: 3 },
  3: { 1: 4, 2: 2 },
  4: { 1: 4, 2: 3 },
  5: { 1: 4, 2: 3, 3: 2 }
};

/** Average HP gained per level for each hit die (5e "take average"). */
export const HIT_DIE_AVG = { d6: 4, d8: 5, d10: 6, d12: 7 };
export const HIT_DIE_MAX = { d6: 6, d8: 8, d10: 10, d12: 12 };

export const FIGHTING_STYLES = [
  "Archery", "Defense", "Dueling", "Great Weapon Fighting", "Protection", "Two-Weapon Fighting"
];

/** A representative set of Spirit-Fused Channeling Options (Obojima). */
export const CHANNELING_OPTIONS = [
  "Ballooning Bag", "Entangling Cord", "Grappling Hook", "Lantern", "Repulsion Field",
  "Shock Trap", "Signal Flare", "Spring Boots", "Tinkerer's Turret"
];

export const CLASSES = {
  druid: {
    label: "Druid",
    startingEquipment: [
      { label: "Shield or a simple weapon", options: [
        { label: "Wooden shield", items: [{ name: "Wooden shield", weight: 6 }] },
        { label: "Mace", items: [{ name: "Mace", weight: 4, dmg: "1d6" }] },
        { label: "Spear", items: [{ name: "Spear", weight: 3, dmg: "1d6" }] }
      ] },
      { label: "Scimitar or a simple melee weapon", options: [
        { label: "Scimitar", items: [{ name: "Scimitar", weight: 3, dmg: "1d6" }] },
        { label: "Quarterstaff", items: [{ name: "Quarterstaff", weight: 4, dmg: "1d6" }] },
        { label: "Club", items: [{ name: "Club", weight: 2, dmg: "1d4" }] }
      ] },
      { fixed: [
        { name: "Leather armor", weight: 10 },
        { name: "Explorer's pack", weight: 10 },
        { name: "Druidic focus", weight: 1 }
      ] }
    ],
    hitDie: "d8",
    caster: "full",
    slots: FULL_SLOTS,
    spellAbility: "wis",
    subclassLevel: 2,
    saves: ["int", "wis"],
    armor: "Light & medium armor, shields (non-metal)",
    weapons: "Clubs, daggers, darts, javelins, maces, quarterstaffs, scimitars, sickles, slings, spears",
    tools: "Herbalism kit",
    skills: { choose: 2, from: ["arc", "ani", "ins", "med", "nat", "prc", "rel", "sur"] },
    cantrips: { 1: 2, 4: 3 },
    asiLevels: [4],
    features: {
      1: [
        { name: "Druidic", desc: "You know Druidic, the secret language of druids." },
        { name: "Spellcasting", desc: "You cast druid spells using Wisdom. Prepared spells = your Wisdom modifier + your druid level." }
      ],
      2: [
        { name: "Wild Shape", desc: "As an action, magically assume the shape of a beast you've seen (CR 1/4, no flying/swimming). 2 uses, regained on a short or long rest.", uses: { max: 2, per: "sr" } }
      ],
      4: [
        { name: "Wild Shape Improvement", desc: "You can transform into beasts up to CR 1/2 (no flying speed)." }
      ]
    },
    subclasses: {
      petal: {
        label: "Circle of the Petal",
        features: {
          2: [
            { name: "Petal Dance", desc: "Bonus action, expend a Wild Shape use to conjure a petal cloud for 1 hour: +1 AC; bonus-action ranged spell attack for 1d6 slashing (2d6 at 5th, scaling); or reaction to reduce damage to you or an ally within 10 ft by your druid level + WIS mod (dissipates the cloud)." }
          ]
        }
      }
    }
  },

  wizard: {
    label: "Wizard",
    startingEquipment: [
      { label: "Quarterstaff or dagger", options: [
        { label: "Quarterstaff", items: [{ name: "Quarterstaff", weight: 4, dmg: "1d6" }] },
        { label: "Dagger", items: [{ name: "Dagger", weight: 1, dmg: "1d4" }] }
      ] },
      { label: "Component pouch or arcane focus", options: [
        { label: "Component pouch", items: [{ name: "Component pouch", weight: 2 }] },
        { label: "Arcane focus", items: [{ name: "Arcane focus", weight: 1 }] }
      ] },
      { label: "Scholar's or explorer's pack", options: [
        { label: "Scholar's pack", items: [{ name: "Scholar's pack", weight: 10 }] },
        { label: "Explorer's pack", items: [{ name: "Explorer's pack", weight: 10 }] }
      ] },
      { fixed: [{ name: "Spellbook", weight: 3 }] }
    ],
    hitDie: "d6",
    caster: "full",
    slots: FULL_SLOTS,
    spellAbility: "int",
    subclassLevel: 2,
    saves: ["int", "wis"],
    armor: "None",
    weapons: "Daggers, darts, slings, quarterstaffs, light crossbows",
    tools: "",
    skills: { choose: 2, from: ["arc", "his", "ins", "inv", "med", "rel"] },
    cantrips: { 1: 3, 4: 4 },
    asiLevels: [4],
    features: {
      1: [
        { name: "Spellcasting", desc: "You cast wizard spells from your spellbook using Intelligence. Prepared spells = your Intelligence modifier + your wizard level." },
        { name: "Arcane Recovery", desc: "Once per day on a short rest, recover expended spell slots totaling half your wizard level (rounded up); none of 6th level or higher.", uses: { max: 1, per: "day" } }
      ],
      4: []
    },
    subclasses: {
      origami: {
        label: "Origami Mage",
        // Origami Familiar grants Find Familiar, always prepared (free).
        grantedSpells: { 2: [{ name: "Find Familiar", level: 1, ritual: true, prepared: true }] },
        features: {
          2: [
            { name: "An Arcane Art", desc: "Bonus action: fold a paper construct (Bird, Cat, Crab, Dragon, or Frog) bound to a creature within 60 ft, lasting hours = half your wizard level. AC = your spell save DC; immune to poison/psychic; destroyed by any damage. Uses = your proficiency bonus per long rest.", uses: { max: 2, per: "lr" } },
            { name: "Origami Familiar", desc: "You always have Find Familiar prepared (doesn't count against prepared spells). The familiar is an origami construct (immune to poison/psychic) with Camouflage, Last Resort, and Reconnaissance abilities." }
          ]
        }
      }
    }
  },

  fighter: {
    label: "Fighter",
    startingEquipment: [
      { label: "Armor", options: [
        { label: "Chain mail", items: [{ name: "Chain mail", weight: 55 }] },
        { label: "Leather armor, longbow & 20 arrows", items: [{ name: "Leather armor", weight: 10 }, { name: "Longbow", weight: 2, dmg: "1d8" }, { name: "Arrows (20)", weight: 1 }] }
      ] },
      { label: "Primary weapons", options: [
        { label: "A martial weapon and a shield", items: [{ name: "Longsword", weight: 3, dmg: "1d8" }, { name: "Shield", weight: 6 }] },
        { label: "Two martial weapons", items: [{ name: "Longsword", weight: 3, dmg: "1d8" }, { name: "Battleaxe", weight: 4, dmg: "1d8" }] }
      ] },
      { label: "Ranged/thrown option", options: [
        { label: "Light crossbow & 20 bolts", items: [{ name: "Light crossbow", weight: 5, dmg: "1d8" }, { name: "Bolts (20)", weight: 1.5 }] },
        { label: "Two handaxes", items: [{ name: "Handaxe (×2)", weight: 4, dmg: "1d6" }] }
      ] },
      { label: "Pack", options: [
        { label: "Dungeoneer's pack", items: [{ name: "Dungeoneer's pack", weight: 12 }] },
        { label: "Explorer's pack", items: [{ name: "Explorer's pack", weight: 10 }] }
      ] }
    ],
    hitDie: "d10",
    caster: "none",
    spellAbility: null,
    subclassLevel: 3,
    saves: ["str", "con"],
    armor: "All armor, shields",
    weapons: "Simple & martial weapons",
    tools: "",
    skills: { choose: 2, from: ["acr", "ani", "ath", "his", "ins", "itm", "prc", "sur"] },
    asiLevels: [4],
    fightingStyles: FIGHTING_STYLES,
    features: {
      1: [
        { name: "Fighting Style", desc: "You adopt a particular style of fighting as your specialty." },
        { name: "Second Wind", desc: "Bonus action: regain 1d10 + your fighter level hit points. Once per short or long rest.", uses: { max: 1, per: "sr" } }
      ],
      2: [
        { name: "Action Surge", desc: "On your turn, take one additional action. Once per short or long rest.", uses: { max: 1, per: "sr" } }
      ],
      5: [
        { name: "Extra Attack", desc: "You can attack twice, instead of once, whenever you take the Attack action on your turn." }
      ]
    },
    subclasses: {
      spiritfused: {
        label: "The Spirit-Fused",
        channeling: CHANNELING_OPTIONS,
        features: {
          3: [
            { name: "Arcane Quirk", desc: "The spirit within you causes strange magical side effects. Choose one or more quirks from the subclass list." },
            { name: "Channel Essence", desc: "You have a pool of 4d6 essence dice. When you make a weapon attack, expend a die to add it to the attack roll or the damage roll (before or after rolling). Regain all on a short or long rest. Grows to 5d6/6d6/7d6/8d6 at 7th/10th/15th/18th.", uses: { max: 4, per: "sr" } },
            { name: "Object Channeling", desc: "Learn one Channeling Option and gain an object to channel it through. Once per short or long rest. You also gain proficiency in the Salvage skill.", uses: { max: 1, per: "sr" } }
          ]
        }
      }
    }
  },

  rogue: {
    label: "Rogue",
    startingEquipment: [
      { label: "Rapier or shortsword", options: [
        { label: "Rapier", items: [{ name: "Rapier", weight: 2, dmg: "1d8" }] },
        { label: "Shortsword", items: [{ name: "Shortsword", weight: 2, dmg: "1d6" }] }
      ] },
      { label: "Shortbow or shortsword", options: [
        { label: "Shortbow & 20 arrows", items: [{ name: "Shortbow", weight: 2, dmg: "1d6" }, { name: "Arrows (20)", weight: 1 }] },
        { label: "Shortsword", items: [{ name: "Shortsword", weight: 2, dmg: "1d6" }] }
      ] },
      { label: "Pack", options: [
        { label: "Burglar's pack", items: [{ name: "Burglar's pack", weight: 12 }] },
        { label: "Dungeoneer's pack", items: [{ name: "Dungeoneer's pack", weight: 12 }] },
        { label: "Explorer's pack", items: [{ name: "Explorer's pack", weight: 10 }] }
      ] },
      { fixed: [
        { name: "Leather armor", weight: 10 },
        { name: "Dagger (×2)", weight: 2, dmg: "1d4" },
        { name: "Thieves' tools", weight: 1 }
      ] }
    ],
    hitDie: "d8",
    caster: "none",
    spellAbility: null,
    subclassLevel: 3,
    saves: ["dex", "int"],
    armor: "Light armor",
    weapons: "Simple weapons, plus hand crossbows, longswords, rapiers, shortswords",
    tools: "Thieves' tools",
    skills: { choose: 4, from: ["acr", "ath", "dec", "ins", "itm", "inv", "prc", "prf", "per", "slt", "ste"] },
    expertise: 2,
    asiLevels: [4],
    features: {
      1: [
        { name: "Expertise", desc: "Choose two of your skill proficiencies (or one skill and thieves' tools); your proficiency bonus is doubled for those checks." },
        { name: "Sneak Attack", desc: "Once per turn, deal an extra 1d6 damage to a creature you hit with a finesse or ranged weapon if you have advantage, or if another enemy of the target is within 5 ft. Scales: 2d6 at 3rd, 3d6 at 5th (+1d6 every odd level)." },
        { name: "Thieves' Cant", desc: "A secret mix of dialect, jargon, and code that lets you hide messages in seemingly normal conversation." }
      ],
      2: [
        { name: "Cunning Action", desc: "A bonus action on each of your turns to Dash, Disengage, or Hide." }
      ],
      5: [
        { name: "Uncanny Dodge", desc: "When an attacker you can see hits you, use your reaction to halve the attack's damage." }
      ]
    },
    subclasses: {
      swashbuckler: {
        label: "Swashbuckler",
        features: {
          3: [
            { name: "Fancy Footwork", desc: "When you make a melee attack against a creature, it can't make opportunity attacks against you for the rest of your turn." },
            { name: "Rakish Audacity", desc: "Add your Charisma modifier to your initiative. You can also use Sneak Attack against a creature if no other creature is within 5 ft of it (you don't need advantage), as long as you don't have disadvantage." }
          ]
        }
      }
    }
  }
};

/** Options for the class dropdown. */
export const CLASS_OPTIONS = Object.entries(CLASSES).map(([key, c]) => ({ key, label: c.label }));

/** Subclass options for a given class key. */
export function subclassOptions(classKey) {
  const c = CLASSES[classKey];
  if (!c) return [];
  return Object.entries(c.subclasses ?? {}).map(([key, s]) => ({ key, label: s.label }));
}

/** Proficiency bonus by character level. */
export function profBonus(level) {
  return 2 + Math.floor((Math.max(1, level) - 1) / 4);
}
