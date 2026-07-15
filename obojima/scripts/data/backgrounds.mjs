/** Obojima backgrounds (PDF p154–158). Each grants 2 skills, tools/languages,
 *  equipment, a feature, and (AHA) some gold. */

export const BACKGROUNDS = {
  aha: {
    label: "Apprentice of AHA", skills: ["his", "inv"], tools: "One Artisan's tool of choice", gold: 13,
    equipment: [
      { name: "Explorer's pack", weight: 10 }, { name: "Candles (5)", weight: 0 },
      { name: "Shovel", weight: 5 }, { name: "Signal whistle", weight: 0 }, { name: "Research journal", weight: 1 }
    ],
    feature: { name: "Wise Reputation", desc: "You've met or are familiar with many of the intellectuals and creative minds in Obojima's villages." }
  },
  diver: {
    label: "Apprentice Diver", skills: ["ath", "nat"], tools: "Diver's Armor",
    equipment: [{ name: "Explorer's pack", weight: 10 }, { name: "Chest", weight: 25 }, { name: "Grappling hook", weight: 4 }],
    feature: { name: "Mariner's Knowledge", desc: "You know the Shallows — what's dangerous and what's delicious — and how to use the gear needed to survive under the waves." }
  },
  witch: {
    label: "Apprentice Witch", skills: ["arc", "sur"], tools: "Alchemist's supplies",
    equipment: [{ name: "Alchemist's supplies", weight: 8 }, { name: "Common ingredients (9)", weight: 0 }],
    feature: { name: "Sibling Student", desc: "You trained under a witch or coven, learning the rudiments of Obojima's folk magic and potion-making." }
  },
  cobbler: {
    label: "Wandering Cobbler", skills: ["ste", "sur"], tools: "Cobbler's tools",
    equipment: [{ name: "Explorer's pack", weight: 10 }, { name: "Cobbler's tools", weight: 5 }, { name: "Climbing gear", weight: 12 }],
    feature: { name: "Pocket Map", desc: "Your travels have given you a keen sense of the island's roads, trails, and shortcuts." }
  },
  medium: {
    label: "Spirit Medium", skills: ["mec", "per"], languages: "Torum",
    equipment: [{ name: "Bedroll", weight: 7 }, { name: "Candles (10)", weight: 0 }, { name: "Common ingredients (2)", weight: 0 }],
    feature: { name: "Connections Beyond", desc: "You can contact certain spirits you've befriended when spirit matters get strange." }
  },
  salvager: {
    label: "Salvager", skills: ["mec", "sal"], tools: "Three Artisan's tools of choice",
    equipment: [{ name: "Abacus", weight: 2 }, { name: "Ball bearings (1000)", weight: 2 }, { name: "Block and tackle", weight: 5 }],
    feature: { name: "Machine Whisperer", desc: "You recognize useful parts among the scattered First Age technology found throughout the island." }
  }
};

export const BACKGROUND_OPTIONS = Object.entries(BACKGROUNDS).map(([key, b]) => ({ key, label: b.label }));
