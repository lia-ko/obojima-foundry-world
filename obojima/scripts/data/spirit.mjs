/**
 * Obojima spirit-companion statblock, stored as an actor flag:
 *   flags.obojima.spirit = { name, type, bonded, img, ac, hp:{value,max},
 *                                  speed, fly, abilities:[{name,effect,uses:{value,max}}], quirk }
 */

import { SYSTEM_ID, num } from "../helpers.mjs";

const MODULE_ID = SYSTEM_ID;
export const SPIRIT_FLAG = "spirit";

const DEFAULT_SPIRIT_IMG = "icons/svg/mystery-man.svg";

/** Read + normalize the spirit block off an actor. */
export function getSpirit(actor) {
  const raw = actor.getFlag(MODULE_ID, SPIRIT_FLAG) ?? {};
  return {
    name: String(raw.name ?? ""),
    type: String(raw.type ?? ""),
    bonded: raw.bonded ?? false,
    img: raw.img || DEFAULT_SPIRIT_IMG,
    ac: num(raw.ac, 10),
    hp: { value: num(raw.hp?.value), max: num(raw.hp?.max) },
    speed: num(raw.speed, 25),
    fly: num(raw.fly),
    quirk: String(raw.quirk ?? ""),
    abilities: Array.isArray(raw.abilities)
      ? raw.abilities.map((a) => ({
          name: String(a?.name ?? ""),
          effect: String(a?.effect ?? ""),
          uses: { value: num(a?.uses?.value), max: num(a?.uses?.max) }
        }))
      : []
  };
}

/** True when a spirit has been set up (has a name). */
export function hasSpirit(actor) {
  return !!getSpirit(actor).name;
}

/** Persist a full spirit block. */
export async function setSpirit(actor, spirit) {
  return actor.setFlag(MODULE_ID, SPIRIT_FLAG, spirit);
}

/** Add a blank spirit ability. */
export async function addAbility(actor) {
  const s = getSpirit(actor);
  s.abilities.push({ name: "", effect: "", uses: { value: 0, max: 0 } });
  return setSpirit(actor, s);
}

/** Remove a spirit ability by index. */
export async function removeAbility(actor, index) {
  const s = getSpirit(actor);
  s.abilities.splice(index, 1);
  return setSpirit(actor, s);
}

/** Post a spirit ability to chat. */
export async function postAbility(actor, ability) {
  const s = getSpirit(actor);
  const name = ability?.name || "Spirit";
  const effect = ability?.effect || "";
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="oa-spirit-chat"><strong>${s.name || "Spirit"} — ${name}</strong><p>${effect}</p></div>`
  });
}
