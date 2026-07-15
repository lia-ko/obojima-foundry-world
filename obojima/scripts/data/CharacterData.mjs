/**
 * Obojima — self-contained character data model.
 * Ability scores are entered; modifiers, saves, skill totals, spell DC/attack,
 * passive perception, encumbrance and attunement are all derived here.
 */

import { ABILITIES, SKILLS } from "../config.mjs";
import { deriveCharacter } from "./derive.mjs";

const fields = foundry.data.fields;

const abilityField = () =>
  new fields.SchemaField({
    value: new fields.NumberField({ required: true, integer: true, initial: 10, min: 0 }),
    proficient: new fields.BooleanField({ initial: false })
  });

const skillField = (ability) =>
  new fields.SchemaField({
    ability: new fields.StringField({ initial: ability, choices: Object.keys(ABILITIES) }),
    // 0 = none, 1 = proficient, 2 = expertise
    proficient: new fields.NumberField({ integer: true, initial: 0, min: 0, max: 2 })
  });

const slotField = () =>
  new fields.SchemaField({
    value: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
    max: new fields.NumberField({ integer: true, initial: 0, min: 0 })
  });

const usesField = () =>
  new fields.SchemaField({
    value: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
    max: new fields.NumberField({ integer: true, initial: 0, min: 0 })
  });

export default class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const abilities = {};
    for (const key of Object.keys(ABILITIES)) abilities[key] = abilityField();

    const skills = {};
    for (const [key, cfg] of Object.entries(SKILLS)) skills[key] = skillField(cfg.ability);

    const spells = {};
    for (let i = 1; i <= 9; i++) spells[`spell${i}`] = slotField();

    return {
      details: new fields.SchemaField({
        species: new fields.StringField({ initial: "" }),
        ancestry: new fields.StringField({ initial: "" }),
        pronouns: new fields.StringField({ initial: "" }),
        alignment: new fields.StringField({ initial: "" }),
        className: new fields.StringField({ initial: "" }),
        subclass: new fields.StringField({ initial: "" }),
        level: new fields.NumberField({ integer: true, initial: 1, min: 1 }),
        builtLevel: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
        background: new fields.StringField({ initial: "" }),
        hitDie: new fields.StringField({ initial: "d8" }),
        ideal: new fields.StringField({ initial: "" }),
        bond: new fields.StringField({ initial: "" }),
        flaw: new fields.StringField({ initial: "" }),
        biography: new fields.HTMLField({ initial: "" })
      }),

      abilities: new fields.SchemaField(abilities),
      skills: new fields.SchemaField(skills),

      attributes: new fields.SchemaField({
        ac: new fields.NumberField({ integer: true, initial: 10, min: 0 }),
        hp: new fields.SchemaField({
          value: new fields.NumberField({ integer: true, initial: 8, min: 0 }),
          max: new fields.NumberField({ integer: true, initial: 8, min: 0 }),
          temp: new fields.NumberField({ integer: true, initial: 0, min: 0 })
        }),
        initBonus: new fields.NumberField({ integer: true, initial: 0 }),
        speed: new fields.NumberField({ integer: true, initial: 30, min: 0 }),
        prof: new fields.NumberField({ integer: true, initial: 2, min: 0 }),
        spellcasting: new fields.StringField({ initial: "wis", choices: Object.keys(ABILITIES) }),
        attunementMax: new fields.NumberField({ integer: true, initial: 3, min: 0 })
      }),

      spells: new fields.SchemaField(spells),

      // Content lists (edited inline on the sheet — this is a system, no compendium drag/drop yet)
      spellList: new fields.ArrayField(new fields.SchemaField({
        name: new fields.StringField({ initial: "" }),
        level: new fields.NumberField({ integer: true, initial: 0, min: 0, max: 9 }),
        prepared: new fields.BooleanField({ initial: false }),
        concentration: new fields.BooleanField({ initial: false }),
        ritual: new fields.BooleanField({ initial: false })
      })),

      features: new fields.ArrayField(new fields.SchemaField({
        name: new fields.StringField({ initial: "" }),
        source: new fields.StringField({ initial: "" }),
        description: new fields.StringField({ initial: "" }),
        uses: usesField(),
        recovery: new fields.StringField({ initial: "" })
      })),

      attacks: new fields.ArrayField(new fields.SchemaField({
        name: new fields.StringField({ initial: "" }),
        ability: new fields.StringField({ initial: "str" }),   // str | dex | none (best = pick higher of str/dex)
        proficient: new fields.BooleanField({ initial: true }),
        damage: new fields.StringField({ initial: "" }),        // damage dice, e.g. "1d8" (ability mod added on roll)
        toHit: new fields.StringField({ initial: "" })          // optional manual to-hit override
      })),

      gear: new fields.ArrayField(new fields.SchemaField({
        name: new fields.StringField({ initial: "" }),
        weight: new fields.NumberField({ initial: 0, min: 0 }),
        attuned: new fields.BooleanField({ initial: false })
      })),

      currency: new fields.SchemaField({
        pp: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
        gp: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
        sp: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
        cp: new fields.NumberField({ integer: true, initial: 0, min: 0 })
      }),

      proficiencies: new fields.SchemaField({
        armor: new fields.StringField({ initial: "" }),
        weapons: new fields.StringField({ initial: "" }),
        tools: new fields.StringField({ initial: "" }),
        languages: new fields.StringField({ initial: "" })
      }),

      // Status
      conditions: new fields.ArrayField(new fields.StringField()),
      concentration: new fields.SchemaField({
        active: new fields.BooleanField({ initial: false }),
        spell: new fields.StringField({ initial: "" })
      })
    };
  }

  /** Compute all derived values. Runs after base data is prepared. */
  prepareDerivedData() {
    deriveCharacter(this);
  }
}
