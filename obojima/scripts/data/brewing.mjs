/**
 * Obojima potion-brewing data, stored as an actor flag:
 *   flags.obojima.brewing = { bonus, larder: [...], recipes: [...] }
 *
 * Full TypeDataModel schemas aren't available for module-owned flags, so we
 * normalize/validate in code and persist plain objects.
 */

import { SYSTEM_ID, num } from "../helpers.mjs";

const MODULE_ID = SYSTEM_ID;
export const BREWING_FLAG = "brewing";

export const RARITIES = ["common", "uncommon", "rare", "very rare", "legendary"];

/** Read + normalize the brewing block off an actor. */
export function getBrewing(actor) {
  const raw = actor.getFlag(MODULE_ID, BREWING_FLAG) ?? {};
  return {
    bonus: num(raw.bonus),
    larder: Array.isArray(raw.larder)
      ? raw.larder.map((i) => ({ name: String(i?.name ?? ""), qty: num(i?.qty, 1) }))
      : [],
    recipes: Array.isArray(raw.recipes)
      ? raw.recipes.map((r) => ({
          name: String(r?.name ?? ""),
          dc: num(r?.dc, 10),
          rarity: RARITIES.includes(r?.rarity) ? r.rarity : "common",
          ingredients: String(r?.ingredients ?? "")
        }))
      : []
  };
}

/** Persist a full brewing block. */
export async function setBrewing(actor, brewing) {
  return actor.setFlag(MODULE_ID, BREWING_FLAG, brewing);
}

/** Add a blank larder ingredient row. */
export async function addIngredient(actor) {
  const b = getBrewing(actor);
  b.larder.push({ name: "", qty: 1 });
  return setBrewing(actor, b);
}

/** Remove a larder ingredient by index. */
export async function removeIngredient(actor, index) {
  const b = getBrewing(actor);
  b.larder.splice(index, 1);
  return setBrewing(actor, b);
}

/** Add a blank recipe row. */
export async function addRecipe(actor) {
  const b = getBrewing(actor);
  b.recipes.push({ name: "", dc: 12, rarity: "common", ingredients: "" });
  return setBrewing(actor, b);
}

/** Remove a recipe by index. */
export async function removeRecipe(actor, index) {
  const b = getBrewing(actor);
  b.recipes.splice(index, 1);
  return setBrewing(actor, b);
}

/**
 * Roll a brew check: 1d20 + brew bonus, posted to chat versus the recipe DC.
 * Returns the Roll.
 */
export async function rollBrew(actor, recipe) {
  const b = getBrewing(actor);
  const roll = await new Roll(`1d20 + ${b.bonus}`, actor.getRollData()).evaluate();
  const dc = num(recipe?.dc, 0);
  const name = recipe?.name || "Potion";
  const success = dc ? roll.total >= dc : null;
  const outcome =
    success === null ? "" : success
      ? `<p class="oa-brew-result oa-success">Brew succeeds!</p>`
      : `<p class="oa-brew-result oa-fail">The brew fails.</p>`;
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `<strong>Brew — ${foundry.utils.escapeHTML?.(name) ?? name}</strong>${dc ? ` &middot; DC ${dc}` : ""}${outcome}`
  });
  return roll;
}
