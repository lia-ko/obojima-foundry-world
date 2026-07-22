/**
 * The default Obojima character sheet (dashboard layout). Reads the actor's own
 * derived data and rolls 1d20 + modifier to chat. Includes brewing + spirit
 * companion panels.
 */

import {
  SYSTEM_ID, T, num, signed, attackAbilityMod,
  identityData, coreStats, abilityRows, saveSummary, skillRows,
  spellData, featureData, inventoryData, bioData, statusData, concentrationData
} from "../helpers.mjs";
import { ABILITIES, SKILLS } from "../config.mjs";
import { CLASSES, CLASS_OPTIONS, subclassOptions } from "../data/classes.mjs";
import { isCasterClass } from "../data/spells.mjs";
import { ANCESTRY_OPTIONS } from "../data/ancestries.mjs";
import { BACKGROUND_OPTIONS } from "../data/backgrounds.mjs";
import { levelUp, pickSpells, generateAbilityScores, applyAncestry, applyBackground, pickFeat, longRest, shortRest, castSpell, arcaneRecovery, useFeature, readFields } from "../data/builder.mjs";
import * as Brewing from "../data/brewing.mjs";
import * as Spirit from "../data/spirit.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const TABS = [
  { id: "spells", label: "Spells" },
  { id: "features", label: "Features" },
  { id: "inventory", label: "Inventory" },
  { id: "potions", label: "Potions & Spirit" },
  { id: "bio", label: "Bio" }
];

/** Content lists stored in the actor's system data (vs. brewing/spirit flags). */
const SYSTEM_LISTS = new Set(["spellList", "features", "attacks", "gear"]);

export default class ObojimaCharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["obojima", "sheet", "actor"],
    position: { width: 960, height: 690 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      roll: ObojimaCharacterSheet.#onRoll,
      toggleEdit: ObojimaCharacterSheet.#onToggleEdit,
      togglePopover: ObojimaCharacterSheet.#onTogglePopover,
      shortRest: ObojimaCharacterSheet.#onShortRest,
      longRest: ObojimaCharacterSheet.#onLongRest,
      expendUse: ObojimaCharacterSheet.#onExpendUse,
      useFeature: ObojimaCharacterSheet.#onUseFeature,
      toggleCondition: ObojimaCharacterSheet.#onToggleCondition,
      toggleConcentration: ObojimaCharacterSheet.#onToggleConcentration,
      toggleSaveProf: ObojimaCharacterSheet.#onToggleSaveProf,
      cycleSkillProf: ObojimaCharacterSheet.#onCycleSkillProf,
      hpDamage: ObojimaCharacterSheet.#onHpDamage,
      hpHeal: ObojimaCharacterSheet.#onHpHeal,
      levelUp: ObojimaCharacterSheet.#onLevelUp,
      pickSpells: ObojimaCharacterSheet.#onPickSpells,
      arcaneRecovery: ObojimaCharacterSheet.#onArcaneRecovery,
      genAbilities: ObojimaCharacterSheet.#onGenAbilities,
      applyAncestry: ObojimaCharacterSheet.#onApplyAncestry,
      applyBackground: ObojimaCharacterSheet.#onApplyBackground,
      pickFeat: ObojimaCharacterSheet.#onPickFeat,
      editImage: ObojimaCharacterSheet.#onEditImage,
      addRow: ObojimaCharacterSheet.#onAddRow,
      removeRow: ObojimaCharacterSheet.#onRemoveRow,
      // Obojima
      brew: ObojimaCharacterSheet.#onBrew,
      addIngredient: ObojimaCharacterSheet.#onAddIngredient,
      removeIngredient: ObojimaCharacterSheet.#onRemoveIngredient,
      addRecipe: ObojimaCharacterSheet.#onAddRecipe,
      removeRecipe: ObojimaCharacterSheet.#onRemoveRecipe,
      addSpirit: ObojimaCharacterSheet.#onAddSpirit,
      addAbility: ObojimaCharacterSheet.#onAddAbility,
      removeAbility: ObojimaCharacterSheet.#onRemoveAbility,
      spiritAbility: ObojimaCharacterSheet.#onSpiritAbility,
      spiritImage: ObojimaCharacterSheet.#onSpiritImage
    }
  };

  static PARTS = {
    body: { template: T("sheet.hbs"), scrollable: [".oa-detail-body"] }
  };

  #activeTab = "spells";
  #popoverOpen = false;
  #editMode = false;
  #boundNavClick;
  #boundFieldChange;

  get title() { return this.actor.name; }

  /* ---------------------------------------- */
  /*  Context                                 */
  /* ---------------------------------------- */

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;
    const abilities = abilityRows(actor);

    const details = actor.system.details ?? {};
    const clsDef = CLASSES[details.className];
    const built = num(details.builtLevel);
    const build = {
      hasClass: !!clsDef,
      built,
      canBuild: !!clsDef && built < 5,
      needsSetup: !!clsDef && built === 0,
      label: !clsDef ? "Pick a class first" : built === 0 ? "★ Build Level 1" : built < 5 ? `Level Up → ${built + 1}` : "Level 5 (max)"
    };

    context.oa = {
      editable: this.isEditable && this.#editMode,
      canEdit: this.isEditable,
      editMode: this.#editMode,
      system: actor.system,
      build,
      extraAttack: details.className === "fighter" && num(details.level, 1) >= 5,
      classOptions: CLASS_OPTIONS,
      subclassOptions: subclassOptions(actor.system.details?.className),
      isCaster: isCasterClass(actor.system.details?.className),
      isWizard: actor.system.details?.className === "wizard",
      ancestryOptions: ANCESTRY_OPTIONS,
      backgroundOptions: BACKGROUND_OPTIONS,
      identity: identityData(actor),
      core: coreStats(actor),
      abilities,
      saves: saveSummary(abilities),
      skills: skillRows(actor),
      spells: spellData(actor),
      features: featureData(actor),
      inventory: inventoryData(actor),
      bio: bioData(actor),
      brewing: Brewing.getBrewing(actor),
      rarities: Brewing.RARITIES,
      spirit: Spirit.getSpirit(actor),
      hasSpirit: Spirit.hasSpirit(actor),
      status: statusData(actor),
      concentration: concentrationData(actor),
      popoverOpen: this.#popoverOpen,
      activeTab: this.#activeTab,
      tabs: TABS.map((t) => ({ ...t, active: this.#activeTab === t.id }))
    };
    return context;
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    // Direct listeners on the root element. Rebind every render (removing the old
    // handler first so they never stack) so tab switching keeps working even if a
    // full re-render swaps out the element. Tab switching goes through a plain click
    // listener rather than the action system for reliability, in view and edit mode.
    this.#boundNavClick ??= this.#onNavClick.bind(this);
    this.#boundFieldChange ??= this.#onListFieldChange.bind(this);
    this.element.removeEventListener("click", this.#boundNavClick);
    this.element.addEventListener("click", this.#boundNavClick);
    this.element.removeEventListener("change", this.#boundFieldChange);
    this.element.addEventListener("change", this.#boundFieldChange);
    this.#mergeHeader();
  }

  /**
   * Single-bar look: move our action header (chips + rest/edit/status) into
   * Foundry's native window header, right after the title and before the window
   * controls — so the sheet shows one title bar instead of two stacked ones.
   */
  #mergeHeader() {
    const winHeader = this.element.querySelector(".window-header");
    const oaHeader = this.element.querySelector(".oa-root > .oa-header");
    if (!winHeader || !oaHeader) return;
    // Drop any copy relocated on a previous render, then re-place the fresh one.
    winHeader.querySelectorAll(":scope > .oa-header").forEach((el) => el.remove());
    const title = winHeader.querySelector(".window-title");
    if (title) title.after(oaHeader); else winHeader.appendChild(oaHeader);
  }

  /** Switch tabs when a [data-oa-tab] control is clicked. */
  #onNavClick(event) {
    const btn = event.target.closest("[data-oa-tab]");
    if (!btn) return;
    const tab = btn.dataset.oaTab;
    if (tab && tab !== this.#activeTab) {
      this.#activeTab = tab;
      this.render();
    }
  }

  /* ---------------------------------------- */
  /*  Rolling                                 */
  /* ---------------------------------------- */

  async #rollCheck(mod, flavor) {
    const roll = await new Roll(`1d20 ${signed(mod)}`).evaluate();
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor });
    return roll;
  }

  static async #onRoll(event, target) {
    const { rollType, key, index } = target.dataset;
    const sys = this.actor.system;
    switch (rollType) {
      case "ability":
        return this.#rollCheck(sys.abilities[key]?.mod ?? 0, `${ABILITIES[key]?.label} Check`);
      case "save":
        return this.#rollCheck(sys.abilities[key]?.save ?? 0, `${ABILITIES[key]?.label} Save`);
      case "skill":
        return this.#rollCheck(sys.skills[key]?.total ?? 0, `${SKILLS[key]?.label}`);
      case "initiative":
        return this.#rollCheck(sys.attributes?.init ?? 0, "Initiative");
      case "attack": {
        const atk = sys.attacks?.[Number(index)];
        if (!atk) return;
        const speaker = ChatMessage.getSpeaker({ actor: this.actor });
        const mod = attackAbilityMod(sys, atk.ability);
        const manual = String(atk.toHit ?? "").trim();
        const hitBonus = manual || signed(mod + (atk.proficient ? num(sys.attributes?.prof) : 0));
        const hitFormula = /^[+-]/.test(hitBonus) ? `1d20${hitBonus}` : `1d20+${num(hitBonus)}`;
        const hitRoll = await new Roll(hitFormula).evaluate();
        await hitRoll.toMessage({ speaker, flavor: `<strong>${atk.name}</strong> — attack` });
        if (atk.damage) {
          const dmgFormula = mod ? `${atk.damage} ${signed(mod)}` : atk.damage;
          const dmgRoll = await new Roll(dmgFormula).evaluate();
          await dmgRoll.toMessage({ speaker, flavor: `<strong>${atk.name}</strong> — damage` });
        }
        return;
      }
      case "spell": {
        const sp = sys.spellList?.[Number(index)];
        if (!sp) return;
        await castSpell(this.actor, sp);
        this.render();
        return;
      }
    }
  }

  /* ---------------------------------------- */
  /*  Navigation + status                     */
  /* ---------------------------------------- */

  static #onToggleEdit() {
    this.#editMode = !this.#editMode;
    this.render({ parts: ["body"] });
  }

  static #onTogglePopover() {
    this.#popoverOpen = !this.#popoverOpen;
    this.render({ parts: ["body"] });
  }

  static async #onToggleCondition(event, target) {
    const cond = target.dataset.conditionId;
    const active = new Set(this.actor.system.conditions ?? []);
    active.has(cond) ? active.delete(cond) : active.add(cond);
    await this.actor.update({ "system.conditions": [...active] });
  }

  static async #onToggleConcentration(event, target) {
    const c = this.actor.system.concentration ?? {};
    await this.actor.update({ "system.concentration.active": !c.active });
  }

  static async #onToggleSaveProf(event, target) {
    const key = target.dataset.key;
    await this.actor.update({ [`system.abilities.${key}.proficient`]: !this.actor.system.abilities[key]?.proficient });
  }

  static async #onCycleSkillProf(event, target) {
    const key = target.dataset.key;
    const cur = num(this.actor.system.skills[key]?.proficient);
    await this.actor.update({ [`system.skills.${key}.proficient`]: (cur + 1) % 3 });
  }

  /* ---------------------------------------- */
  /*  Hit points: damage / heal               */
  /* ---------------------------------------- */

  static #onHpDamage() { return this.#adjustHp(-1); }
  static #onHpHeal() { return this.#adjustHp(1); }

  /** Prompt for an amount and apply it to HP. Damage soaks temp HP first; heal caps at max. */
  async #adjustHp(sign) {
    const label = sign < 0 ? "Damage" : "Heal";
    const amount = await ObojimaCharacterSheet.#promptAmount(label);
    if (!amount) return;
    const hp = this.actor.system.attributes?.hp ?? {};
    const max = num(hp.max);
    let value = num(hp.value);
    let temp = num(hp.temp);
    if (sign < 0) {
      let dmg = amount;
      if (temp > 0) { const soak = Math.min(temp, dmg); temp -= soak; dmg -= soak; }
      value = Math.max(0, value - dmg);
    } else {
      value = value + amount;
      if (max > 0) value = Math.min(value, max);
    }
    await this.actor.update({ "system.attributes.hp.value": value, "system.attributes.hp.temp": temp });
  }

  static async #promptAmount(label) {
    const DV2 = foundry.applications.api.DialogV2;
    // DialogV2 buttons sit outside the content form, so read the DOM via readFields.
    const content = `<div class="oa-build-form" style="padding:4px 2px">
      <label style="display:flex;flex-direction:column;gap:5px;font-size:13px">${label} amount
      <input type="number" name="n" value="1" min="0" autofocus style="font-size:16px;padding:5px;text-align:center"></label></div>`;
    const result = await DV2.wait({
      window: { title: `${label} — Hit Points` },
      content,
      buttons: [
        { action: "ok", label, default: true, callback: (event, button, dialog) => readFields(dialog?.element ?? null) },
        { action: "cancel", label: "Cancel", callback: () => null }
      ]
    }).catch(() => null);
    const n = result && result !== "cancel" ? num(result.n) : 0;
    return n > 0 ? n : 0;
  }

  /* ---------------------------------------- */
  /*  Level up (class builder)                */
  /* ---------------------------------------- */

  static async #onLevelUp() {
    await levelUp(this.actor);
    this.render();
  }

  static async #onPickSpells() {
    await pickSpells(this.actor);
    this.render();
  }

  static async #onArcaneRecovery() {
    await arcaneRecovery(this.actor);
    this.render();
  }

  static async #onGenAbilities() {
    await generateAbilityScores(this.actor);
    this.render();
  }

  static async #onApplyAncestry() {
    await applyAncestry(this.actor);
    this.render();
  }

  static async #onApplyBackground() {
    await applyBackground(this.actor);
    this.render();
  }

  static async #onPickFeat() {
    await pickFeat(this.actor);
    this.render();
  }

  static async #onShortRest() {
    await shortRest(this.actor);
    this.render();
  }

  static async #onLongRest() {
    await longRest(this.actor);
    this.render();
  }

  static async #onExpendUse(event, target) {
    const idx = Number(target.dataset.index);
    const feats = foundry.utils.duplicate(this.actor.system.features ?? []);
    const f = feats[idx];
    if (!f || num(f.uses?.max) <= 0) return;
    const max = num(f.uses.max);
    const val = num(f.uses.value);
    f.uses = { value: val > 0 ? val - 1 : max, max }; // expend one; wrap back to full when empty
    await this.actor.update({ "system.features": feats });
  }

  static async #onUseFeature(event, target) {
    await useFeature(this.actor, Number(target.dataset.index));
    this.render();
  }

  static async #onEditImage() {
    const fp = new foundry.applications.apps.FilePicker.implementation({
      type: "image", current: this.actor.img,
      callback: (path) => this.actor.update({ img: path })
    });
    return fp.browse();
  }

  /* ---------------------------------------- */
  /*  System-array rows (spells/features/…)   */
  /* ---------------------------------------- */

  static async #onAddRow(event, target) {
    const list = target.dataset.list;
    const blanks = {
      spellList: { name: "", level: 1, prepared: false, concentration: false, ritual: false },
      features: { name: "", source: "", description: "", uses: { value: 0, max: 0 }, recovery: "" },
      attacks: { name: "", ability: "str", proficient: true, damage: "", toHit: "" },
      gear: { name: "", weight: 0, attuned: false }
    };
    const arr = foundry.utils.duplicate(this.actor.system[list] ?? []);
    arr.push(blanks[list] ?? {});
    await this.actor.update({ [`system.${list}`]: arr });
  }

  static async #onRemoveRow(event, target) {
    const { list, index } = target.dataset;
    const arr = foundry.utils.duplicate(this.actor.system[list] ?? []);
    arr.splice(Number(index), 1);
    await this.actor.update({ [`system.${list}`]: arr });
  }

  /* ---------------------------------------- */
  /*  Obojima: brewing                        */
  /* ---------------------------------------- */

  static async #onBrew(event, target) {
    const recipe = Brewing.getBrewing(this.actor).recipes[Number(target.dataset.index)];
    await Brewing.rollBrew(this.actor, recipe);
  }
  static async #onAddIngredient() { await Brewing.addIngredient(this.actor); this.render({ parts: ["body"] }); }
  static async #onRemoveIngredient(event, target) { await Brewing.removeIngredient(this.actor, Number(target.dataset.index)); this.render({ parts: ["body"] }); }
  static async #onAddRecipe() { await Brewing.addRecipe(this.actor); this.render({ parts: ["body"] }); }
  static async #onRemoveRecipe(event, target) { await Brewing.removeRecipe(this.actor, Number(target.dataset.index)); this.render({ parts: ["body"] }); }

  /* ---------------------------------------- */
  /*  Obojima: spirit                         */
  /* ---------------------------------------- */

  static async #onAddSpirit() { await Spirit.setSpirit(this.actor, { ...Spirit.getSpirit(this.actor), name: "New Spirit" }); this.render({ parts: ["body"] }); }
  static async #onAddAbility() { await Spirit.addAbility(this.actor); this.render({ parts: ["body"] }); }
  static async #onRemoveAbility(event, target) { await Spirit.removeAbility(this.actor, Number(target.dataset.index)); this.render({ parts: ["body"] }); }
  static async #onSpiritAbility(event, target) {
    const ability = Spirit.getSpirit(this.actor).abilities[Number(target.dataset.index)];
    await Spirit.postAbility(this.actor, ability);
  }
  static async #onSpiritImage() {
    const spirit = Spirit.getSpirit(this.actor);
    const fp = new foundry.applications.apps.FilePicker.implementation({
      type: "image", current: spirit.img,
      callback: async (path) => { await Spirit.setSpirit(this.actor, { ...spirit, img: path }); this.render({ parts: ["body"] }); }
    });
    return fp.browse();
  }

  /* ---------------------------------------- */
  /*  Inline list-field editing               */
  /* ---------------------------------------- */

  async #onListFieldChange(event) {
    // Class / subclass dropdowns: update explicitly and re-render so the subclass
    // options repopulate (don't rely on the form's submitOnChange for this).
    const detailSel = event.target.closest("[data-oa-detail]");
    if (detailSel) {
      const prop = detailSel.dataset.oaDetail;
      // Coerce to a single string and validate against known keys so only a real
      // class/subclass key (or "") is ever stored.
      const raw = Array.isArray(detailSel.value) ? detailSel.value[0] : String(detailSel.value ?? "");
      const upd = {};
      if (prop === "className") {
        upd["system.details.className"] = CLASSES[raw] ? raw : "";
        upd["system.details.subclass"] = ""; // reset subclass on class change
      } else if (prop === "subclass") {
        const clsKey = this.actor.system.details?.className;
        upd["system.details.subclass"] = CLASSES[clsKey]?.subclasses?.[raw] ? raw : "";
      } else {
        upd[`system.details.${prop}`] = raw;
      }
      await this.actor.update(upd);
      this.render();
      return;
    }

    const input = event.target.closest("[data-oa-list]");
    if (!input) return;
    const list = input.dataset.oaList;
    const index = Number(input.dataset.oaIndex);
    const prop = input.dataset.oaProp;
    let value = input.type === "number" ? Number(input.value) : input.value;
    if (input.type === "checkbox") value = input.checked;

    if (SYSTEM_LISTS.has(list)) {
      const arr = foundry.utils.duplicate(this.actor.system[list] ?? []);
      if (arr[index]) { foundry.utils.setProperty(arr[index], prop, value); await this.actor.update({ [`system.${list}`]: arr }); }
    } else if (list === "larder" || list === "recipes") {
      const b = Brewing.getBrewing(this.actor);
      if (b[list][index]) { foundry.utils.setProperty(b[list][index], prop, value); await Brewing.setBrewing(this.actor, b); }
    } else if (list === "abilities" || list === "spirit") {
      const s = Spirit.getSpirit(this.actor);
      if (list === "spirit") foundry.utils.setProperty(s, prop, value);
      else if (s.abilities[index]) foundry.utils.setProperty(s.abilities[index], prop, value);
      await Spirit.setSpirit(this.actor, s);
    }
  }
}
