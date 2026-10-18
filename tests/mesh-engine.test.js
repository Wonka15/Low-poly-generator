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

test("every built-in catalog model builds a finite, non-empty mesh", () => {
  const catalog = [
    "a lollipop", "a compact car", "an F1 race car", "a game controller",
    "a flower", "a flower in a vase", "a small house", "a Japanese maple tree",
    "a low-poly frog", "a sneaker with laces", "a tabletop fan with three blades",
    "a chair", "a table", "a stool", "a mug", "a bottle", "a vase", "a tree",
    "a lamp", "a robot", "a sofa", "a speaker", "a crate", "a mushroom", "a rock", "a gear"
  ];
  for (const prompt of catalog) {
    const result = buildPromptModel(THREE, prompt, 1);
    const report = inspectMesh(result.group);
    assert.equal(result.recognized, true, prompt + " should be recognized");
    assert.ok(report.meshes > 0, prompt + " should contain meshes");
    assert.ok(report.vertices > 0 && report.triangles > 0, prompt + " should contain geometry");
    assert.equal(report.nonFinite, 0, prompt + " has non-finite coordinates");
    assert.equal(report.degenerate, 0, prompt + " has zero-area triangles");
  }
});

test("flower-in-vase model has a hollow vase and three complete flower heads", () => {
  const result = buildPromptModel(THREE, "a flower in a vase", 1);
  const meshes = [];
  result.group.traverse(o => { if (o.isMesh) meshes.push(o); });
  assert.ok(meshes.some(m => m.name === "Hollow vase body" && m.geometry.type === "LatheGeometry"));
  assert.equal(meshes.filter(m => m.name === "Flower center").length, 3);
  const stems = meshes.filter(m => m.name === "Stem");
  assert.equal(stems.length, 3);
  // All stems must enter the narrow vase mouth instead of floating beside the rim.
  assert.ok(stems.every(stem => Math.abs(stem.position.x) < 0.15));
  assert.ok(stems.every(stem => stem.position.y - 0.36 <= 0.68));
});

test("mug handle and car wheels use expected orientations", () => {
  const mug = buildPromptModel(THREE, "a mug", 1);
  const handle = [];
  mug.group.traverse(o => { if (o.isMesh && o.name === "Handle") handle.push(o); });
  assert.equal(handle.length, 1);
  assert.ok(Math.abs(handle[0].rotation.x) < 1e-8, "mug handle should face forward");
  const car = buildPromptModel(THREE, "a compact car", 1);
  const wheels = [];
  car.group.traverse(o => { if (o.isMesh && o.name === "Wheel") wheels.push(o); });
  assert.equal(wheels.length, 4);
  assert.ok(wheels.every(w => Math.abs(w.rotation.z - Math.PI / 2) < 1e-8));
});
