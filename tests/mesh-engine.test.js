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
  car.group.traverse(o => { if (o.isMesh && (o.name === "Road tyre" || o.name === "Wheel")) wheels.push(o); });
  assert.equal(wheels.length, 4);
  assert.ok(wheels.every(w => Math.abs(w.rotation.z - Math.PI / 2) < 1e-8));
});

test("shoe, controller, and flower use purpose-built readable geometry", () => {
  const shoe = buildPromptModel(THREE, "a sneaker with laces", 1);
  const shoeMeshes = [];
  shoe.group.traverse(o => { if (o.isMesh) shoeMeshes.push(o); });
  assert.ok(shoeMeshes.some(m => m.name === "Sculpted sneaker upper" && m.geometry.type === "ExtrudeGeometry"));
  assert.ok(shoeMeshes.some(m => m.name === "Contoured rubber outsole" && m.geometry.type === "ExtrudeGeometry"));
  assert.equal(shoeMeshes.filter(m => /^Lace /.test(m.name)).length, 8);

  const controller = buildPromptModel(THREE, "a game controller", 1);
  const controllerMeshes = [];
  controller.group.traverse(o => { if (o.isMesh) controllerMeshes.push(o); });
  assert.ok(controllerMeshes.some(m => m.name === "Controller body" && m.geometry.type === "ExtrudeGeometry"));
  assert.equal(controllerMeshes.filter(m => /^Action button /.test(m.name)).length, 4);
  assert.ok(controllerMeshes.filter(m => /^Action button /.test(m.name)).every(m => Math.abs(m.rotation.x - Math.PI / 2) < 1e-8));

  const flower = buildPromptModel(THREE, "a flower", 1);
  const flowerMeshes = [];
  flower.group.traverse(o => { if (o.isMesh) flowerMeshes.push(o); });
  const petals = flowerMeshes.filter(m => /^Petal /.test(m.name));
  assert.equal(petals.length, 6);
  assert.ok(petals.every(m => m.geometry.type === "BufferGeometry"));
  assert.ok(petals.every(m => m.geometry.getAttribute("position").count === 6));
  for (const [name, meshes] of [["shoe", shoeMeshes], ["controller", controllerMeshes], ["flower", flowerMeshes]]) {
    const report = inspectMesh({ updateMatrixWorld() {}, traverse(fn) { meshes.forEach(fn); } });
    assert.equal(report.nonFinite, 0, name + " should have finite vertices");
    assert.equal(report.degenerate, 0, name + " should not have zero-area triangles");
  }
});

test("hero props have distinctive silhouettes and materials", () => {
  const candy = buildPromptModel(THREE, "a lollipop", 1);
  const candyParts = []; candy.group.traverse(o => { if (o.isMesh) candyParts.push(o); });
  const disc = candyParts.find(m => m.name === "Flat candy disc");
  assert.ok(disc && disc.geometry.type === "CylinderGeometry");
  assert.ok(Math.abs(disc.rotation.x - Math.PI / 2) < 1e-8, "candy face should point toward the viewer");
  assert.notEqual(disc.material.color.getHex(), 0xbfc9d4, "candy should have a bright material");

  const f1 = buildPromptModel(THREE, "an F1 race car", 1);
  const f1Parts = []; f1.group.traverse(o => { if (o.isMesh) f1Parts.push(o); });
  for (const name of ["Tapered nose", "Front wing main plane", "Rear wing plane", "Wide racing tyre", "Cockpit rim"]) {
    assert.ok(f1Parts.some(m => m.name === name), "F1 car should include " + name);
  }
  assert.equal(f1Parts.filter(m => m.name === "Wide racing tyre").length, 4);
  assert.notEqual(f1Parts.find(m => m.name === "Carbon monocoque")?.material.color.getHex(), 0xbfc9d4);

  const car = buildPromptModel(THREE, "a compact car", 1);
  const carParts = []; car.group.traverse(o => { if (o.isMesh) carParts.push(o); });
  assert.ok(carParts.some(m => m.name === "Sloped passenger cabin"));
  assert.equal(carParts.filter(m => m.name === "Road tyre").length, 4);
});

test("all catalog props have coordinated non-default color palettes", () => {
  const catalog = [
    ["a lollipop", "Candy"], ["a compact car", "Body"], ["an F1 race car", "Body"],
    ["a game controller", "Shell"], ["a flower", "Petals"], ["a flower in a vase", "Vase"],
    ["a small house", "Body"], ["a Japanese maple tree", "Canopy red"], ["a low-poly frog", "Body"],
    ["a sneaker", "Upper"], ["a tabletop fan", "Blades"], ["a chair", "Seat"],
    ["a table", "Top"], ["a stool", "Seat"], ["a mug", "Body"], ["a bottle", "Body"],
    ["a vase", "Body"], ["a tree", "Foliage"], ["a lamp", "Shade"], ["a robot", "Torso"],
    ["a sofa", "Base"], ["a speaker", "Cabinet"], ["a crate", "Body"], ["a mushroom", "Cap"],
    ["a rock", "Rock"], ["a gear", "Body"]
  ];
  for (const [prompt, part] of catalog) {
    const result = buildPromptModel(THREE, prompt, 1);
    const meshes = [];
    result.group.traverse(o => { if (o.isMesh && o.userData.part === part) meshes.push(o); });
    assert.ok(meshes.length > 0, prompt + " should have colored " + part);
    assert.ok(meshes.some(m => m.material.color.getHex() !== 0xbfc9d4), prompt + " should not be default grey");
  }
});

test("Japanese maple has pointed leaf silhouettes and autumn colors", () => {
  const result = buildPromptModel(THREE, "a Japanese maple tree", 1);
  const leaves = [];
  result.group.traverse(o => { if (o.isMesh && o.name === "Pointed maple leaf") leaves.push(o); });
  assert.ok(leaves.length >= 18);
  assert.ok(leaves.every(m => m.geometry.type === "ExtrudeGeometry"));
  assert.ok(new Set(leaves.map(m => m.material.color.getHex())).size >= 3);
});

test("sneaker has contrasting panels and crossed laces", () => {
  const result = buildPromptModel(THREE, "a sneaker with laces", 1);
  const meshes = [];
  result.group.traverse(o => { if (o.isMesh) meshes.push(o); });
  assert.equal(meshes.filter(m => /^Lace /.test(m.name)).length, 8);
  assert.ok(meshes.some(m => m.name === "Rounded contrasting toe cap" && m.material.color.getHex() !== meshes.find(x => x.name === "Sculpted sneaker upper").material.color.getHex()));
  assert.ok(meshes.filter(m => /Side stripe/.test(m.name)).length >= 4);
});
