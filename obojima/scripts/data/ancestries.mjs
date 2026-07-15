/**
 * Obojima ancestries (PDF p125–130). ASI is flexible (+2/+1) for the three
 * Obojima peoples; Human uses +1 to all. Traits become feature cards; the elf
 * Oaka Mark grants a cantrip.
 */

export const ANCESTRIES = {
  human: {
    label: "Human", speed: 30, asi: { type: "all1" }, languages: 1,
    traits: [
      { name: "Islander", desc: "Humans are Obojima's most plentiful people, and the spark of adventure burns brightest in them." }
    ]
  },
  dara: {
    label: "Dara", speed: 30, asi: { type: "2-1" }, skills: 3, languages: 1,
    traits: [
      { name: "Create Talisman", desc: "As an action, create a paper talisman — Sun (Dash/Disengage), Earth (drop to 1 HP instead of 0), or Moon (next hit deals extra radiant = your level). Lasts 1 hour; once per long rest." },
      { name: "Sacred Revelation", desc: "As an action, touch and absorb information or skills stored inside the thumbprint-like dara glyphs found across the island." }
    ]
  },
  elf: {
    label: "Elf", speed: 30, asi: { type: "2-1" }, languages: 0, darkvision: true,
    traits: [
      { name: "Darkvision", desc: "See in dim light within 60 ft as if bright, and darkness as if dim (grayscale)." },
      { name: "Ethereal Sight", desc: "As an action, shift your sight into the ethereal to see Spirit-Realm creatures (glowing outlines) for 1 hour. Uses = proficiency bonus per long rest." }
    ],
    oakaMark: [
      { label: "Courage", cantrip: "Resistance", spell: "Heroism" },
      { label: "Fury", cantrip: "Sacred Flame", spell: "Shatter" },
      { label: "Harmony", cantrip: "Guidance", spell: "Calm Emotions" },
      { label: "Nature", cantrip: "Dancing Lights", spell: "Animal Messenger" },
      { label: "Purity", cantrip: "Spare the Dying", spell: "Lesser Restoration" },
      { label: "Selflessness", cantrip: "Resilient Friendship", spell: "Gift" }
    ]
  },
  nakudama: {
    label: "Nakudama", speed: 25, swim: 30, asi: { type: "2-1" }, languages: ["Naku Naku"],
    traits: [
      { name: "Amphibious", desc: "You can breathe air and water." },
      { name: "Standing Leap", desc: "Long jump up to 20 ft and high jump up to 15 ft, with or without a running start." },
      { name: "Grasping Tongue", desc: "Bonus action: pull an object (≤5 lb) within 15 ft to your hand (contested Strength if worn/carried)." },
      { name: "Latching Tongue", desc: "Bonus action: latch your tongue onto a surface or creature (≥1 size larger) within 15 ft and pull yourself to it." }
    ]
  }
};

export const ANCESTRY_OPTIONS = Object.entries(ANCESTRIES).map(([key, a]) => ({ key, label: a.label }));
