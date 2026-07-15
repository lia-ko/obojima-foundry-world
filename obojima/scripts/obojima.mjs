/**
 * Obojima — a self-contained Foundry v14 game system.
 * Entry point: registers the character data model, the character sheet
 * (as default), Handlebars helpers, and template preloads.
 */

import { SYSTEM_ID, TEMPLATES, registerHandlebarsHelpers } from "./helpers.mjs";
import CharacterData from "./data/CharacterData.mjs";
import ObojimaCharacterSheet from "./sheets/CharacterSheet.mjs";

Hooks.once("init", () => {
  console.log(`${SYSTEM_ID} | initializing Obojima system`);

  registerHandlebarsHelpers();

  // Data model for the character actor type.
  CONFIG.Actor.dataModels.character = CharacterData;

  // Replace the core actor sheet with the Obojima sheet as the default.
  const DocumentSheetConfig = foundry.applications.apps.DocumentSheetConfig;
  const CoreActorSheet = foundry.appv1?.sheets?.ActorSheet ?? globalThis.ActorSheet;
  try {
    if (CoreActorSheet) DocumentSheetConfig.unregisterSheet(Actor, "core", CoreActorSheet);
  } catch (err) {
    console.warn(`${SYSTEM_ID} | could not unregister core actor sheet`, err);
  }
  DocumentSheetConfig.registerSheet(Actor, SYSTEM_ID, ObojimaCharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "Obojima Character Sheet"
  });

  foundry.applications.handlebars.loadTemplates(TEMPLATES);
});
