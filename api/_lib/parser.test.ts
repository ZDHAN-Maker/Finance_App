import { parseTransactionMessage, isParseError } from "./parser.js";

type Case = {
  input: string;
  expect: { type: string; amount: number; description: string; categoryName: string } | { error: true };
};

const cases: Case[] = [
  { input: "30k bensin", expect: { type: "expense", amount: 30000, description: "bensin", categoryName: "Transportasi" } },
  { input: "25rb makan", expect: { type: "expense", amount: 25000, description: "makan", categoryName: "Makanan" } },
  { input: "1jt listrik", expect: { type: "expense", amount: 1000000, description: "listrik", categoryName: "Tagihan" } },
  { input: "pengeluaran 30k bensin", expect: { type: "expense", amount: 30000, description: "bensin", categoryName: "Transportasi" } },
  { input: "pemasukan 5jt gaji", expect: { type: "income", amount: 5000000, description: "gaji", categoryName: "Gaji" } },
  { input: "gaji 5jt", expect: { type: "income", amount: 5000000, description: "gaji", categoryName: "Gaji" } },
  { input: "1,5jt sewa kos", expect: { type: "expense", amount: 1500000, description: "sewa kos", categoryName: "Lainnya" } },
  { input: "30000 bensin", expect: { type: "expense", amount: 30000, description: "bensin", categoryName: "Transportasi" } },
  { input: "30.000 bensin", expect: { type: "expense", amount: 30000, description: "bensin", categoryName: "Transportasi" } },
  { input: "beli sesuatu", expect: { error: true } },
  { input: "", expect: { error: true } },
  { input: "freelance 2 juta desain logo", expect: { type: "income", amount: 2000000, description: "freelance desain logo", categoryName: "Freelance" } },
];

let pass = 0;
let fail = 0;

for (const c of cases) {
  const result = parseTransactionMessage(c.input);

  if ("error" in c.expect) {
    if (isParseError(result)) {
      pass++;
      console.log(`OK   "${c.input}" -> error: ${result.message}`);
    } else {
      fail++;
      console.error(`FAIL "${c.input}" -> expected error, got`, result);
    }
    continue;
  }

  if (isParseError(result)) {
    fail++;
    console.error(`FAIL "${c.input}" -> expected result, got error: ${result.message}`);
    continue;
  }

  const ok =
    result.type === c.expect.type &&
    result.amount === c.expect.amount &&
    result.description === c.expect.description &&
    result.categoryName === c.expect.categoryName;

  if (ok) {
    pass++;
    console.log(`OK   "${c.input}" ->`, result);
  } else {
    fail++;
    console.error(`FAIL "${c.input}" -> expected`, c.expect, "got", result);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
