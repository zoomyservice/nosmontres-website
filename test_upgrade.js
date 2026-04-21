// Test the upgraded chatbot logic without DOM
const fs = require('fs');
let code = fs.readFileSync(__dirname + '/js/chatbot.js', 'utf8');

// Strip the IIFE wrapper and DOM/UI code — keep only logic
// Find where init() function starts and cut there
const initIdx = code.indexOf('function init()');
const logicCode = code.substring(code.indexOf("'use strict';")+14, initIdx);

// Mock globals
global.window = { NM: { lang: 'en' }, innerWidth: 1200 };
global.localStorage = { getItem: () => 'en', setItem() {} };
global.fetch = () => Promise.resolve({ ok: false });

// Expose the functions we need
const wrapped = `(function() { 'use strict';
${logicCode}
return { getResponse, classify, stockMatch, memory, ctx };
})()`;

let bot;
try { bot = eval(wrapped); } catch(e) { console.log('EVAL ERROR:', e.message); process.exit(1); }

async function test() {
  console.log('=== TEST 1: Direct ref lookup (price only) ===');
  const r1 = await bot.getResponse('116613LB');
  console.log(r1.substring(0, 250));
  console.log('---');

  console.log('\n=== TEST 2: "tell me more about" stock item ===');
  const r2 = await bot.getResponse('tell me more about Rolex Submariner acier/or ref. 116613LB');
  console.log(r2.substring(0, 500));
  console.log('---');

  console.log('\n=== TEST 3: "what is the Submariner" ===');
  const r3 = await bot.getResponse('what is the Submariner?');
  console.log(r3.substring(0, 400));
  console.log('---');

  console.log('\n=== TEST 4: Synonym - "when can I visit" ===');
  const r4 = await bot.getResponse('when can I come by on Saturday?');
  console.log(r4.substring(0, 250));
  console.log('---');

  console.log('\n=== TEST 5: Pronoun - "how much is it?" (after Submariner context) ===');
  const r5 = await bot.getResponse('how much is it?');
  console.log(r5.substring(0, 300));
  console.log('---');

  console.log('\n=== TEST 6: Multi-intent - sell and buy ===');
  const r6 = await bot.getResponse('I want to sell my Rolex and buy a Patek');
  console.log(r6.substring(0, 400));
  console.log('---');

  console.log('\n=== TEST 7: Follow-up - "tell me more" ===');
  const r7 = await bot.getResponse('tell me more');
  console.log(r7.substring(0, 300));
  console.log('---');

  console.log('\n=== MEMORY STATE ===');
  console.log('Phase:', bot.memory.phase);
  console.log('Topics:', [...bot.memory.topics]);
  console.log('Turns:', bot.memory.turnCount);
}

test().catch(e => console.log('TEST ERROR:', e.message));
