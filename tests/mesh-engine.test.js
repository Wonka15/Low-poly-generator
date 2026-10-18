import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildPromptModel, classifyPrompt, inspectMesh } from "../src/mesh-engine.js";

test("prompt classifier recognizes the starter catalog", () => {
  for (const [prompt, expected] of [
    ["build a chair", "chair"], ["make a kitchen table", "table"],
    ["create a coffee mug", "mug"], ["generate a small house", "house"],
    ["make a robot", "robot"], ["build a compact car", "car"],
    ["make a tabletop fan with four blades", "fan"], ["make a vase", "vase"]
  ]) assert.equal(classifyPrompt(prompt), expected, prompt);
});

test("a chair prompt creates named separate parts and honors leg count", () => {
  const result = buildPromptModel(THREE, "Build a chair with 4 legs", 1);
  assert.equal(result.type, "chair");
  assert.equal(result.recognized, true);
  const legs = [];
  result.group.traverse(o => { if (o.isMesh && o.userData.part === "Legs") legs.push(o); });
  assert.equal(legs.length, 4);
  assert.ok(result.report.vertices > 0);
  assert.ok(result.report.triangles > 0);
});

test("a fan prompt honors the requested blade count", () => {
  const result = buildPromptModel(THREE, "Build a tabletop fan with 5 blades", 0);
  const blades = [];
  result.group.traverse(o => { if (o.isMesh && /^Blade /.test(o.name)) blades.push(o); });
  assert.equal(blades.length, 5);
  assert.equal(result.type, "fan");
});

test("generated mesh buffers have finite coordinates and non-zero triangles", () => {
  for (const prompt of ["chair", "table", "mug", "bottle", "house", "tree", "lamp", "robot", "car", "sofa", "speaker", "crate", "mushroom", "rock", "gear"]) {
    const result = buildPromptModel(THREE, prompt, 1);
    const report = inspectMesh(result.group);
    assert.equal(report.nonFinite, 0, prompt + " non-finite coordinates");
    assert.ok(report.triangles > 0, prompt + " should contain triangles");
  }
});

test("unknown objects produce an honest generic blockout", () => {
  const result = buildPromptModel(THREE, "a spaceship", 1);
  assert.equal(result.type, "block");
  assert.equal(result.recognized, false);
  assert.equal(result.group.children.length, 1);
});
