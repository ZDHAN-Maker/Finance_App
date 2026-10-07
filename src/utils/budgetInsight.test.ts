import assert from "node:assert/strict";
import { test } from "node:test";
import { getBudgetHealth, getBudgetSplit } from "./budgetInsight";

test("getBudgetSplit memberi pembagian 60/20/20 yang masuk akal", () => {
  const result = getBudgetSplit(10000000);
  assert.equal(result.needs, 6000000);
  assert.equal(result.wants, 2000000);
  assert.equal(result.saving, 2000000);
});

test("getBudgetHealth menghitung sisa anggaran dan status", () => {
  const result = getBudgetHealth(10000000, 6500000, 8000000);
  assert.equal(result.status, "aman");
  assert.equal(result.remaining, 1500000);
});
