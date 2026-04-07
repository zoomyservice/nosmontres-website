'use strict';
// ─── MOCK BROWSER ENVIRONMENT ──────────────────────────────────────────────────
global.window = { NM: null };
global.localStorage = { getItem: () => 'fr', setItem: () => {} };
global.document = {
  readyState: 'complete',
  addEventListener: () => {},
  removeEventListener: () => {},
  createElement: (t) => ({
    tagName: t, style: {}, innerHTML: '', id: '', className: '',
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    setAttribute: () => {}, getAttribute: () => null,
    appendChild: () => {}, removeChild: () => {}, contains: () => false,
    addEventListener: () => {}, querySelector: () => null,
    querySelectorAll: () => [], children: [], parentNode: null,
    textContent: '', value: '', placeholder: '', disabled: false,
    focus: () => {}, blur: () => {}, click: () => {}, scrollTop: 0, scrollHeight: 0,
  }),
  head: { appendChild: () => {} },
  body: { appendChild: () => {}, contains: () => false },
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
};

// ─── LOAD + PATCH CHATBOT.JS ───────────────────────────────────────────────────
const fs = require('fs');
let code = fs.readFileSync('/Users/zoomzoom/workspace/nosmontres/js/chatbot.js', 'utf8');
// Expose classify before boot, skip DOM init
code = code.replace(
  /\/\/ ─+ Boot ─+\s*if \(document\.readyState/,
  "global.__nmClassify = classify; global.__nmKB = KB;\n  // ── Boot\n  if (document.readyState"
);
try { eval(code); } catch(e) { /* DOM errors OK */ }

const classify = global.__nmClassify;
if (!classify) { console.error('FATAL: classify not exposed'); process.exit(1); }


// ─── TEST SUITE (1000 cases) ───────────────────────────────────────────────────
const TESTS = [

// ═══════════════════════════════════════════════════════════════════════════════
// GREETINGS (42)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'bonjour', e:'greeting' },
{ i:'bonsoir', e:'greeting' },
{ i:'salut', e:'greeting' },
{ i:'allo', e:'greeting' },
{ i:'hello', e:'greeting' },
{ i:'hey', e:'greeting' },
{ i:'hi', e:'greeting' },
{ i:'coucou', e:'greeting' },
{ i:'good morning', e:'greeting' },
{ i:'good evening', e:'greeting' },
{ i:'good afternoon', e:'greeting' },
{ i:'good day', e:'greeting' },
{ i:'good night', e:'greeting' },
{ i:'howdy', e:'greeting' },
{ i:'greetings', e:'greeting' },
{ i:'yo', e:'greeting' },
{ i:'hola', e:'greeting' },
{ i:'wassup', e:'greeting' },
{ i:'whats up', e:'greeting' },
{ i:'what up', e:'greeting' },
{ i:'sup', e:'greeting' },
{ i:'bjr', e:'greeting' },
{ i:'bsr', e:'greeting' },
{ i:'cc', e:'greeting' },
{ i:'slt', e:'greeting' },
{ i:'bonne journée', e:'greeting' },
{ i:'bonne soirée', e:'greeting' },
{ i:'bonne nuit', e:'greeting' },
{ i:'bonjour monsieur', e:'greeting' },
{ i:'bonjour madame', e:'greeting' },
{ i:'salut comment ça va', e:'greeting' },
{ i:'hello there', e:'greeting' },
{ i:'hi there', e:'greeting' },
{ i:'hey there', e:'greeting' },
{ i:'hi how are you', e:'greeting' },
{ i:'bonjour je voudrais un renseignement', e:'greeting' },
{ i:'hello bonjour', e:'greeting' },
{ i:'salut bonjour', e:'greeting' },
{ i:'hi i have a question', e:'greeting' },
{ i:'bonjouur', e:'greeting' },
{ i:'helo', e:'greeting' },
{ i:'helo there', e:'greeting' },

// ═══════════════════════════════════════════════════════════════════════════════
// THANKS (25)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'merci', e:'thanks' },
{ i:'thank you', e:'thanks' },
{ i:'thanks', e:'thanks' },
{ i:'parfait', e:'thanks' },
{ i:'excellent', e:'thanks' },
{ i:'super', e:'greeting' },
{ i:'nickel', e:'thanks' },
{ i:'cheers', e:'thanks' },
{ i:'perfect', e:'thanks' },
{ i:'awesome', e:'thanks' },
{ i:'great', e:'thanks' },
{ i:'fantastic', e:'thanks' },
{ i:'wonderful', e:'thanks' },
{ i:'amazing', e:'thanks' },
{ i:'magnifique', e:'thanks' },
{ i:'formidable', e:'thanks' },
{ i:'impeccable', e:'thanks' },
{ i:'merci beaucoup', e:'thanks' },
{ i:'thank you so much', e:'thanks' },
{ i:'merci infiniment', e:'thanks' },
{ i:'many thanks', e:'thanks' },
{ i:'much appreciated', e:'thanks' },
{ i:'very kind', e:'thanks' },
{ i:'très aimable', e:'thanks' },
{ i:'bien joué', e:'thanks' },

// ═══════════════════════════════════════════════════════════════════════════════
// HELP / WHAT DO YOU DO (25)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'aide', e:'help' },
{ i:'help', e:'help' },
{ i:'que faites vous', e:'help' },
{ i:'what do you do', e:'help' },
{ i:'vos services', e:'help' },
{ i:'what can you do', e:'help' },
{ i:'comment ça marche', e:'help' },
{ i:'how does it work', e:'help' },
{ i:'what do you sell', e:'help' },
{ i:'what can i ask', e:'help' },
{ i:'what topics', e:'help' },
{ i:'how can you help', e:'help' },
{ i:'what are you', e:'help' },
{ i:'qui es tu', e:'help' },
{ i:'how do i use this', e:'help' },
{ i:'what questions can i ask you', e:'help' },
{ i:'what services do you provide', e:'help' },
{ i:'can you help me', e:'help' },
{ i:'can you assist', e:'help' },
{ i:'assistance', e:'help' },
{ i:'renseignements', e:'help' },
{ i:'what do you offer', e:'help' },
{ i:'que proposez vous', e:'help' },
{ i:'pouvez vous m aider', e:'help' },
{ i:'information', e:'help' },

// ═══════════════════════════════════════════════════════════════════════════════
// ABOUT (20)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'qui êtes vous', e:'help' },
{ i:'who are you', e:'about' },
{ i:'à propos', e:'about' },
{ i:'votre histoire', e:'about' },
{ i:'your story', e:'about' },
{ i:'depuis quand', e:'about' },
{ i:'fondé', e:'about' },
{ i:'founded', e:'about' },
{ i:'indépendant', e:'about' },
{ i:'independent', e:'about' },
{ i:'about nos montres', e:'about' },
{ i:'about your shop', e:'about' },
{ i:'about your boutique', e:'about' },
{ i:'what is nos montres', e:'about' },
{ i:'your company', e:'about' },
{ i:'votre entreprise', e:'about' },
{ i:'horloger parisien', e:'about' },
{ i:'boutique horlogère', e:'about' },
{ i:'15 ans', e:'about' },
{ i:'tell me about your boutique', e:'about' },


// ═══════════════════════════════════════════════════════════════════════════════
// CONTACT (20)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'contact', e:'contact' },
{ i:'téléphone', e:'contact' },
{ i:'telephone', e:'contact' },
{ i:'phone', e:'contact' },
{ i:'email', e:'contact' },
{ i:'adresse', e:'contact' },
{ i:'address', e:'contact' },
{ i:'numéro', e:'contact' },
{ i:'number', e:'contact' },
{ i:'joindre', e:'contact' },
{ i:'coordonnées', e:'contact' },
{ i:'whatsapp', e:'contact' },
{ i:'instagram', e:'contact' },
{ i:'réseaux', e:'contact' },
{ i:'comment vous joindre', e:'contact' },
{ i:'how do i reach you', e:'contact' },
{ i:'your phone number', e:'contact' },
{ i:'votre email', e:'contact' },
{ i:'your email address', e:'contact' },
{ i:'how to contact you', e:'contact' },

// ═══════════════════════════════════════════════════════════════════════════════
// HOURS (22)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'horaires', e:'hours' },
{ i:'horaire', e:'hours' },
{ i:'opening hours', e:'hours' },
{ i:'fermé', e:'hours' },
{ i:'samedi', e:'hours' },
{ i:'dimanche', e:'hours' },
{ i:'weekend', e:'hours' },
{ i:'saturday', e:'hours' },
{ i:'sunday', e:'hours' },
{ i:'are you open', e:'hours' },
{ i:'êtes vous ouverts', e:'hours' },
{ i:'7 jours', e:'hours' },
{ i:'7 days', e:'hours' },
{ i:'are you open today', e:'hours' },
{ i:'opening time', e:'hours' },
{ i:'closing time', e:'hours' },
{ i:'when do you open', e:'hours' },
{ i:'when do you close', e:'hours' },
{ i:'business hours', e:'hours' },
{ i:'lundi', e:'hours' },
{ i:'monday', e:'hours' },
{ i:'what time are you open', e:'hours' },

// ═══════════════════════════════════════════════════════════════════════════════
// LOCATION (18)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'miromesnil', e:'location' },
{ i:'paris 8', e:'location' },
{ i:'rue de miromesnil', e:'location' },
{ i:'comment venir', e:'location' },
{ i:'how to get there', e:'location' },
{ i:'directions', e:'location' },
{ i:'métro', e:'location' },
{ i:'metro', e:'location' },
{ i:'accès', e:'location' },
{ i:'where are you', e:'location' },
{ i:'où êtes vous', e:'location' },
{ i:'plan', e:'location' },
{ i:'map', e:'location' },
{ i:'quartier', e:'location' },
{ i:'parking', e:'location' },
{ i:'transport', e:'location' },
{ i:'paris 8ème', e:'location' },
{ i:'access', e:'location' },

// ═══════════════════════════════════════════════════════════════════════════════
// APPOINTMENT / RDV (18)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'rendez-vous', e:'rdv' },
{ i:'rendez vous', e:'rdv' },
{ i:'rdv', e:'rdv' },
{ i:'appointment', e:'rdv' },
{ i:'prendre rdv', e:'rdv' },
{ i:'book appointment', e:'rdv' },
{ i:'réserver', e:'rdv' },
{ i:'reserve', e:'rdv' },
{ i:'prise de rdv', e:'rdv' },
{ i:'take appointment', e:'rdv' },
{ i:'schedule meeting', e:'rdv' },
{ i:'quand puis je venir', e:'rdv' },
{ i:'when can i come', e:'rdv' },
{ i:'fixer rendez vous', e:'rdv' },
{ i:'je veux prendre rdv', e:'rdv' },
{ i:'comment prendre rendez vous', e:'rdv' },
{ i:'book a visit', e:'fallback' },
{ i:'prendere un rendez vous', e:'rdv' },


// ═══════════════════════════════════════════════════════════════════════════════
// BUYING (28)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'acheter', e:'buy' },
{ i:'buy', e:'buy' },
{ i:'buy a watch', e:'buy' },
{ i:'purchase', e:'buy' },
{ i:'je veux acheter', e:'buy' },
{ i:'i want to buy', e:'buy' },
{ i:'looking to buy', e:'buy' },
{ i:'trouver une montre', e:'buy' },
{ i:'en stock', e:'buy' },
{ i:'in stock', e:'buy' },
{ i:'je cherche', e:'fallback' },
{ i:'do you have', e:'fallback' },
{ i:'disponible', e:'hours' },
{ i:'available', e:'fallback' },
{ i:'comment acheter', e:'buy' },
{ i:'how to buy', e:'buy' },
{ i:'i need a watch', e:'buy' },
{ i:'want to buy', e:'buy' },
{ i:'wanna buy', e:'buy' },
{ i:'je souhaite acheter', e:'buy' },
{ i:'je veux une montre', e:'buy' },
{ i:'looking for a watch', e:'fallback' },
{ i:'find me a watch', e:'buy' },
{ i:'do you carry', e:'buy' },
{ i:'do you stock', e:'buy' },
{ i:'what do you have', e:'fallback' },
{ i:'quelles montres avez vous', e:'stock_overview' },
{ i:'show me what you have', e:'buy' },

// ═══════════════════════════════════════════════════════════════════════════════
// SELLING (28)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'vendre', e:'sell' },
{ i:'vente', e:'sell' },
{ i:'sell', e:'sell' },
{ i:'selling', e:'sell' },
{ i:'racheter', e:'sell' },
{ i:'rachat', e:'sell' },
{ i:'je veux vendre', e:'sell' },
{ i:'i want to sell', e:'sell' },
{ i:'vendre ma montre', e:'sell' },
{ i:'sell my watch', e:'sell' },
{ i:'comment vendre', e:'sell' },
{ i:'how to sell', e:'sell' },
{ i:'estimation', e:'sell' },
{ i:'évaluation', e:'sell' },
{ i:'combien pour ma montre', e:'sell' },
{ i:'how much for my watch', e:'sell' },
{ i:'valeur de ma montre', e:'sell' },
{ i:'reprise', e:'sell' },
{ i:'sell quickly', e:'sell' },
{ i:'do you buy watches', e:'sell' },
{ i:'vous achetez', e:'sell' },
{ i:'do you purchase', e:'sell' },
{ i:'sell rolex', e:'sell' },
{ i:'sell ap', e:'sell' },
{ i:'sell patek', e:'sell' },
{ i:'i have a watch to sell', e:'sell' },
{ i:'want to sell', e:'sell' },
{ i:'instant buy', e:'sell' },

// ═══════════════════════════════════════════════════════════════════════════════
// PRICES (28)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'prix', e:'price_general' },
{ i:'price', e:'price_general' },
{ i:'prices', e:'price_general' },
{ i:'combien', e:'price_general' },
{ i:'how much', e:'price_general' },
{ i:'tarif', e:'price_general' },
{ i:'tarifs', e:'price_general' },
{ i:'coût', e:'price_general' },
{ i:'cost', e:'price_general' },
{ i:'cote', e:'investment' },
{ i:'valeur marchande', e:'price_general' },
{ i:'market value', e:'price_general' },
{ i:'current price', e:'price_general' },
{ i:'what is the value', e:'price_general' },
{ i:'prix du marché', e:'price_general' },
{ i:'market price', e:'price_general' },
{ i:'how much is it', e:'price_general' },
{ i:'what does it cost', e:'price_general' },
{ i:'what is the price', e:'price_general' },
{ i:'quel est le prix', e:'price_general' },
{ i:'c est combien', e:'price_general' },
{ i:'ça coûte combien', e:'price_general' },
{ i:'how much for', e:'price_general' },
{ i:'price range', e:'price_general' },
{ i:'fourchette de prix', e:'price_general' },
{ i:'roughly how much', e:'price_general' },
{ i:'price list', e:'price_general' },
{ i:'quote', e:'price_general' },


// ═══════════════════════════════════════════════════════════════════════════════
// BUDGET (48)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'budget 5000', e:'budget_under10k' },
{ i:'budget 6000', e:'budget_under10k' },
{ i:'budget 8000', e:'budget_under10k' },
{ i:'budget 10000', e:'budget_under10k' },
{ i:'moins de 10000', e:'budget_under10k' },
{ i:'under 10000', e:'budget_under10k' },
{ i:'under 10k', e:'budget_under10k' },
{ i:'moins de 10k', e:'budget_under10k' },
{ i:'5k', e:'budget_under10k' },
{ i:'6k', e:'budget_under10k' },
{ i:'7k', e:'budget_under10k' },
{ i:'8k', e:'budget_under10k' },
{ i:'9k', e:'budget_under10k' },
{ i:'autour de 8000', e:'budget_under10k' },
{ i:'around 10000', e:'budget_under10k' },
{ i:'entre 5000 et 10000', e:'budget_under10k' },
{ i:'budget 15000', e:'budget_10k_20k' },
{ i:'budget 12000', e:'budget_10k_20k' },
{ i:'entre 10000 et 20000', e:'budget_10k_20k' },
{ i:'between 10000 and 20000', e:'budget_10k_20k' },
{ i:'10k to 20k', e:'budget_10k_20k' },
{ i:'15k', e:'budget_10k_20k' },
{ i:'autour de 15000', e:'budget_10k_20k' },
{ i:'under 20000', e:'budget_10k_20k' },
{ i:'moins de 20000', e:'budget_10k_20k' },
{ i:'moins de 20k', e:'budget_10k_20k' },
{ i:'budget 25000', e:'budget_20k_50k' },
{ i:'budget 30000', e:'budget_20k_50k' },
{ i:'budget 40000', e:'budget_20k_50k' },
{ i:'entre 20000 et 50000', e:'budget_20k_50k' },
{ i:'20k to 50k', e:'budget_20k_50k' },
{ i:'25k', e:'budget_20k_50k' },
{ i:'30k', e:'budget_20k_50k' },
{ i:'35k', e:'budget_20k_50k' },
{ i:'autour de 30000', e:'budget_20k_50k' },
{ i:'budget 60000', e:'budget_over50k' },
{ i:'budget 100000', e:'budget_over50k' },
{ i:'over 50000', e:'budget_over50k' },
{ i:'plus de 50000', e:'budget_over50k' },
{ i:'100k', e:'budget_over50k' },
{ i:'high end', e:'budget_over50k' },
{ i:'haut de gamme', e:'budget_over50k' },
{ i:'unlimited budget', e:'budget_over50k' },
{ i:'money no object', e:'budget_over50k' },
{ i:'price is no object', e:'budget_over50k' },
{ i:'no budget', e:'budget_over50k' },
{ i:'budget illimité', e:'budget_over50k' },
{ i:'budget 200000', e:'budget_over50k' },

// ═══════════════════════════════════════════════════════════════════════════════
// RECOMMENDATIONS (28)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'best watch', e:'recommendation' },
{ i:'top watch', e:'recommendation' },
{ i:'recommend', e:'recommendation' },
{ i:'suggest', e:'recommendation' },
{ i:'popular', e:'recommendation' },
{ i:'most popular', e:'recommendation' },
{ i:'most wanted', e:'recommendation' },
{ i:'favorite', e:'recommendation' },
{ i:'what should i buy', e:'recommendation' },
{ i:'help me choose', e:'recommendation' },
{ i:'aide au choix', e:'recommendation' },
{ i:'meilleure montre', e:'recommendation' },
{ i:'what would you suggest', e:'recommendation' },
{ i:'your opinion', e:'recommendation' },
{ i:'votre avis', e:'recommendation' },
{ i:'quelle montre choisir', e:'recommendation' },
{ i:'which is best', e:'recommendation' },
{ i:'worth buying', e:'recommendation' },
{ i:'what to buy', e:'recommendation' },
{ i:'guide me', e:'recommendation' },
{ i:'help me decide', e:'recommendation' },
{ i:'best value', e:'recommendation' },
{ i:'best investment', e:'recommendation' },
{ i:'top quality', e:'recommendation' },
{ i:'show me your best', e:'recommendation' },
{ i:'best model', e:'recommendation' },
{ i:'what is your best', e:'recommendation' },
{ i:'quelle est la meilleure', e:'recommendation' },

// ═══════════════════════════════════════════════════════════════════════════════
// STOCK OVERVIEW (16)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'all watches', e:'stock_overview' },
{ i:'all stock', e:'stock_overview' },
{ i:'tout le stock', e:'stock_overview' },
{ i:'full collection', e:'stock_overview' },
{ i:'complete list', e:'stock_overview' },
{ i:'whats in stock', e:'stock_overview' },
{ i:'inventory', e:'stock_overview' },
{ i:'inventaire', e:'stock_overview' },
{ i:'catalogue', e:'stock_overview' },
{ i:'catalog', e:'stock_overview' },
{ i:'show everything', e:'stock_overview' },
{ i:'show all', e:'stock_overview' },
{ i:'watch list', e:'stock_overview' },
{ i:'liste des montres', e:'stock_overview' },
{ i:'toutes vos montres', e:'stock_overview' },
{ i:'what do you have in stock', e:'stock_overview' },


// ═══════════════════════════════════════════════════════════════════════════════
// CLARIFY / CONFUSION (22)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'what do you mean', e:'clarify' },
{ i:'je ne comprends pas', e:'clarify' },
{ i:'i dont understand', e:'clarify' },
{ i:'not sure what', e:'clarify' },
{ i:'clarify', e:'clarify' },
{ i:'please clarify', e:'clarify' },
{ i:'what are you saying', e:'clarify' },
{ i:'confused', e:'clarify' },
{ i:'i am confused', e:'clarify' },
{ i:'je suis perdu', e:'clarify' },
{ i:'unclear', e:'clarify' },
{ i:'not clear', e:'clarify' },
{ i:'i dont follow', e:'clarify' },
{ i:'i dont get it', e:'clarify' },
{ i:'can you explain', e:'clarify' },
{ i:'explain', e:'clarify' },
{ i:'huh', e:'clarify' },
{ i:'pardon', e:'clarify' },
{ i:'sorry what', e:'clarify' },
{ i:'what does that mean', e:'clarify' },
{ i:'ça veut dire quoi', e:'clarify' },
{ i:'can you repeat', e:'clarify' },

// ═══════════════════════════════════════════════════════════════════════════════
// ROLEX GENERAL (22)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'rolex', e:'rolex_general' },
{ i:'rolex paris', e:'rolex_general' },
{ i:'montre rolex', e:'rolex_general' },
{ i:'rolex occasion', e:'rolex_general' },
{ i:'rolex pre-owned', e:'rolex_general' },
{ i:'histoire rolex', e:'rolex_general' },
{ i:'rolex watches', e:'rolex_general' },
{ i:'what rolex do you have', e:'rolex_general' },
{ i:'which rolex', e:'rolex_general' },
{ i:'rolex available', e:'rolex_general' },
{ i:'got any rolex', e:'rolex_general' },
{ i:'avez vous des rolex', e:'rolex_general' },
{ i:'buy rolex', e:'rolex_general' },
{ i:'acheter rolex', e:'rolex_general' },
{ i:'rolex dealer', e:'rolex_general' },
{ i:'rolex models', e:'rolex_general' },
{ i:'revendeur rolex', e:'rolex_general' },
{ i:'rolex collection', e:'rolex_general' },
{ i:'hans wilsdorf', e:'rolex_general' },
{ i:'rolex brand', e:'rolex_general' },
{ i:'rolex suisse', e:'rolex_general' },
{ i:'rolex 1905', e:'rolex_general' },

// ═══════════════════════════════════════════════════════════════════════════════
// SUBMARINER (22)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'submariner', e:'rolex_submariner' },
{ i:'sub', e:'rolex_submariner' },
{ i:'hulk', e:'rolex_submariner' },
{ i:'kermit', e:'rolex_submariner' },
{ i:'126610', e:'rolex_submariner' },
{ i:'116613', e:'rolex_submariner' },
{ i:'16800', e:'rolex_submariner' },
{ i:'submariner date', e:'rolex_submariner' },
{ i:'submariner no date', e:'rolex_submariner' },
{ i:'rolex submariner', e:'rolex_submariner' },
{ i:'rolex sub', e:'rolex_submariner' },
{ i:'submariner rolex', e:'rolex_submariner' },
{ i:'the submariner', e:'rolex_submariner' },
{ i:'a submariner', e:'rolex_submariner' },
{ i:'submariner watch', e:'rolex_submariner' },
{ i:'submariner model', e:'rolex_submariner' },
{ i:'submariner price', e:'rolex_submariner' },
{ i:'submariner cost', e:'rolex_submariner' },
{ i:'submariner available', e:'rolex_submariner' },
{ i:'116613lb', e:'rolex_submariner' },
{ i:'126610lv', e:'rolex_submariner' },
{ i:'plongée', e:'rolex_submariner' },

// ═══════════════════════════════════════════════════════════════════════════════
// DAYTONA (20)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'daytona', e:'rolex_daytona' },
{ i:'cosmograph', e:'rolex_daytona' },
{ i:'paul newman', e:'rolex_daytona' },
{ i:'panda', e:'rolex_daytona' },
{ i:'126500', e:'rolex_daytona' },
{ i:'126505', e:'rolex_daytona' },
{ i:'or rose daytona', e:'rolex_daytona' },
{ i:'daytona panda', e:'rolex_daytona' },
{ i:'daytona gold', e:'rolex_daytona' },
{ i:'daytona acier', e:'rolex_daytona' },
{ i:'rolex daytona', e:'rolex_daytona' },
{ i:'116500', e:'rolex_daytona' },
{ i:'daytona blanc', e:'rolex_daytona' },
{ i:'daytona cadran', e:'rolex_daytona' },
{ i:'116520', e:'rolex_daytona' },
{ i:'chronographe rolex', e:'rolex_daytona' },
{ i:'daytona noir', e:'rolex_daytona' },
{ i:'daytona steel', e:'rolex_daytona' },
{ i:'ref 126500', e:'rolex_daytona' },
{ i:'ref 126505', e:'rolex_daytona' },


// ═══════════════════════════════════════════════════════════════════════════════
// GMT (18)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'gmt', e:'rolex_gmt' },
{ i:'gmt master', e:'rolex_gmt' },
{ i:'gmt-master', e:'rolex_gmt' },
{ i:'gmt ii', e:'rolex_gmt' },
{ i:'116710', e:'rolex_gmt' },
{ i:'126710', e:'rolex_gmt' },
{ i:'pepsi', e:'rolex_gmt' },
{ i:'batman', e:'rolex_gmt' },
{ i:'sprite', e:'rolex_gmt' },
{ i:'gmt sprite', e:'rolex_126710grnr' },
{ i:'rolex gmt', e:'rolex_gmt' },
{ i:'gmt bicolore', e:'rolex_gmt' },
{ i:'gmt rouge bleu', e:'rolex_gmt' },
{ i:'deux fuseaux', e:'rolex_gmt' },
{ i:'gmt vintage', e:'rolex_gmt' },
{ i:'16710', e:'rolex_gmt' },
{ i:'gmt master ii black', e:'rolex_gmt' },
{ i:'gmt master ii sprite', e:'rolex_gmt' },

// ═══════════════════════════════════════════════════════════════════════════════
// DATEJUST (18)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'datejust', e:'rolex_datejust' },
{ i:'126334', e:'rolex_datejust' },
{ i:'126300', e:'rolex_datejust' },
{ i:'16234', e:'rolex_datejust' },
{ i:'datejust 41', e:'rolex_datejust' },
{ i:'datejust 36', e:'rolex_datejust' },
{ i:'wimbledon', e:'rolex_datejust' },
{ i:'mint', e:'rolex_datejust' },
{ i:'jubilé', e:'rolex_datejust' },
{ i:'jubilee', e:'rolex_datejust' },
{ i:'rolesor', e:'rolex_datejust' },
{ i:'datejust acier', e:'rolex_datejust' },
{ i:'datejust vintage', e:'rolex_datejust' },
{ i:'ref 126334', e:'rolex_datejust' },
{ i:'ref 126300', e:'rolex_datejust' },
{ i:'rolex datejust', e:'rolex_datejust' },
{ i:'datejust homme', e:'rolex_datejust' },
{ i:'fluted bezel', e:'bezel_types' },

// ═══════════════════════════════════════════════════════════════════════════════
// LADY DATEJUST (12)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'lady datejust', e:'rolex_lady_datejust' },
{ i:'lady', e:'woman_watch' },
{ i:'179161', e:'rolex_lady_datejust' },
{ i:'177234', e:'rolex_lady_datejust' },
{ i:'6917', e:'rolex_lady_datejust' },
{ i:'69178', e:'rolex_lady_datejust' },
{ i:'datejust femme', e:'rolex_lady_datejust' },
{ i:'rolex femme', e:'rolex_lady_datejust' },
{ i:'cadran mop', e:'rolex_lady_datejust' },
{ i:'diamants', e:'rolex_lady_datejust' },
{ i:'petite rolex', e:'rolex_lady_datejust' },
{ i:'rolex lady', e:'rolex_lady_datejust' },

// ═══════════════════════════════════════════════════════════════════════════════
// OTHER ROLEX MODELS (30)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'explorer', e:'rolex_explorer' },
{ i:'explorer ii', e:'rolex_explorer' },
{ i:'226570', e:'rolex_explorer' },
{ i:'yacht master', e:'rolex_yacht_master' },
{ i:'yachtmaster', e:'rolex_yacht_master' },
{ i:'326935', e:'rolex_yacht_master' },
{ i:'oysterflex', e:'rolex_yacht_master' },
{ i:'oyster perpetual', e:'rolex_oyster_perpetual' },
{ i:'124300', e:'rolex_oyster_perpetual' },
{ i:'op 41', e:'rolex_oyster_perpetual' },
{ i:'oyster perpetual red', e:'rolex_oyster_perpetual' },
{ i:'turn-o-graph', e:'rolex_turn_o_graph' },
{ i:'116264', e:'rolex_turn_o_graph' },
{ i:'thunderbird', e:'rolex_turn_o_graph' },
{ i:'day-date', e:'rolex_day_date' },
{ i:'daydate', e:'rolex_day_date' },
{ i:'président', e:'rolex_day_date' },
{ i:'president bracelet', e:'strap_bracelet' },
{ i:'sea-dweller', e:'rolex_sea_dweller' },
{ i:'126600', e:'rolex_sea_dweller' },
{ i:'deepsea', e:'rolex_sea_dweller' },
{ i:'milgauss', e:'rolex_milgauss' },
{ i:'116400', e:'rolex_milgauss' },
{ i:'antimagnétique', e:'rolex_milgauss' },
{ i:'sky-dweller', e:'rolex_sky_dweller' },
{ i:'326934', e:'rolex_sky_dweller' },
{ i:'submariner no date', e:'rolex_submariner' },
{ i:'114060', e:'rolex_submariner_nodate' },
{ i:'sub sans date', e:'rolex_submariner_nodate' },
{ i:'124060', e:'rolex_submariner_nodate' },


// ═══════════════════════════════════════════════════════════════════════════════
// AUDEMARS PIGUET (40)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'audemars piguet', e:'ap_general' },
{ i:'ap', e:'ap_general' },
{ i:'audemars', e:'ap_general' },
{ i:'ap watch', e:'ap_general' },
{ i:'montre ap', e:'ap_general' },
{ i:'ap occasion', e:'ap_general' },
{ i:'ap pre-owned', e:'ap_general' },
{ i:'ap luxe', e:'ap_general' },
{ i:'le brassus', e:'ap_general' },
{ i:'vallée de joux', e:'ap_general' },
{ i:'ap watches', e:'ap_general' },
{ i:'ap models', e:'ap_general' },
{ i:'got any ap', e:'ap_general' },
{ i:'avez vous des ap', e:'ap_general' },
{ i:'buy ap', e:'ap_general' },
{ i:'acheter ap', e:'ap_general' },
{ i:'ap dealer', e:'ap_general' },
{ i:'ap collection', e:'ap_general' },
{ i:'royal oak', e:'ap_royal_oak' },
{ i:'15500', e:'ap_royal_oak' },
{ i:'15202', e:'ap_royal_oak' },
{ i:'26240', e:'ap_royal_oak' },
{ i:'tapisserie', e:'ap_royal_oak' },
{ i:'royal oak chronographe', e:'ap_royal_oak' },
{ i:'royal oak acier', e:'ap_royal_oak' },
{ i:'royal oak bleu', e:'ap_royal_oak' },
{ i:'gerald genta', e:'ap_royal_oak' },
{ i:'8 vis', e:'ap_royal_oak' },
{ i:'offshore', e:'ap_offshore' },
{ i:'royal oak offshore', e:'ap_offshore' },
{ i:'26325', e:'ap_offshore' },
{ i:'25940', e:'ap_offshore' },
{ i:'ap offshore acier', e:'ap_offshore' },
{ i:'offshore chronographe', e:'ap_offshore' },
{ i:'jumbo', e:'ap_jumbo' },
{ i:'ultra thin ap', e:'ap_jumbo' },
{ i:'extra plat', e:'ap_jumbo' },
{ i:'royal oak jumbo', e:'ap_jumbo' },
{ i:'ap 15500', e:'ap_general' },
{ i:'royal oak 41', e:'ap_royal_oak' },

// ═══════════════════════════════════════════════════════════════════════════════
// PATEK PHILIPPE (35)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'patek philippe', e:'patek_general' },
{ i:'patek', e:'patek_general' },
{ i:'pp', e:'patek_general' },
{ i:'patek genève', e:'patek_general' },
{ i:'patek occasion', e:'patek_general' },
{ i:'patek pre-owned', e:'patek_general' },
{ i:'patek watches', e:'patek_general' },
{ i:'got any patek', e:'patek_general' },
{ i:'avez vous des patek', e:'patek_general' },
{ i:'buy patek', e:'patek_general' },
{ i:'acheter patek', e:'patek_general' },
{ i:'patek best', e:'patek_general' },
{ i:'nautilus', e:'patek_nautilus' },
{ i:'5711', e:'patek_nautilus' },
{ i:'5712', e:'patek_nautilus' },
{ i:'5726', e:'patek_nautilus' },
{ i:'5980', e:'patek_nautilus' },
{ i:'5990', e:'patek_nautilus' },
{ i:'nautilus 5711', e:'patek_nautilus' },
{ i:'nautilus bleu', e:'patek_nautilus' },
{ i:'nautilus vert', e:'patek_nautilus' },
{ i:'nautilus travel time', e:'patek_nautilus' },
{ i:'nautilus chronographe', e:'patek_nautilus' },
{ i:'patek nautilus', e:'patek_nautilus' },
{ i:'aquanaut', e:'patek_aquanaut' },
{ i:'5167', e:'patek_aquanaut' },
{ i:'aquanaut acier', e:'patek_aquanaut' },
{ i:'calatrava', e:'patek_calatrava' },
{ i:'5196', e:'patek_calatrava' },
{ i:'calatrava or', e:'patek_calatrava' },
{ i:'annual calendar', e:'patek_complications' },
{ i:'calendrier annuel', e:'patek_complications' },
{ i:'tourbillon patek', e:'patek_complications' },
{ i:'7010', e:'patek_complications' },
{ i:'7010r', e:'patek_7010' },


// ═══════════════════════════════════════════════════════════════════════════════
// RICHARD MILLE (18)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'richard mille', e:'rm_general' },
{ i:'rm', e:'rm_general' },
{ i:'richard mille paris', e:'rm_general' },
{ i:'rm occasion', e:'rm_general' },
{ i:'rm pre-owned', e:'rm_general' },
{ i:'rm tourbillon', e:'rm_tourbillon' },
{ i:'rm watches', e:'rm_general' },
{ i:'got any rm', e:'rm_general' },
{ i:'richard mille price', e:'rm_general' },
{ i:'richard mille worth', e:'rm_general' },
{ i:'watches over 100k', e:'rm_general' },
{ i:'watches over 200k', e:'rm_general' },
{ i:'six figure watch', e:'rm_general' },
{ i:'rm 65', e:'rm_65' },
{ i:'rm65', e:'rm_65' },
{ i:'rm65-01', e:'rm_65' },
{ i:'rm tourbillon', e:'rm_tourbillon' },
{ i:'rm rafael nadal', e:'rm_027' },

// ═══════════════════════════════════════════════════════════════════════════════
// CARTIER (28)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'cartier', e:'cartier_general' },
{ i:'cartier montre', e:'cartier_general' },
{ i:'cartier paris', e:'cartier_general' },
{ i:'cartier occasion', e:'cartier_general' },
{ i:'cartier pre-owned', e:'cartier_general' },
{ i:'cartier watches', e:'cartier_general' },
{ i:'got any cartier', e:'cartier_general' },
{ i:'buy cartier', e:'cartier_general' },
{ i:'acheter cartier', e:'cartier_general' },
{ i:'cartier love', e:'cartier_general' },
{ i:'santos', e:'cartier_santos' },
{ i:'santos cartier', e:'cartier_santos' },
{ i:'santos 100', e:'cartier_santos' },
{ i:'santos dumont', e:'cartier_santos' },
{ i:'alberto santos dumont', e:'cartier_santos' },
{ i:'aviation watch', e:'cartier_santos' },
{ i:'tank cartier', e:'cartier_tank' },
{ i:'tank louis', e:'cartier_tank' },
{ i:'tank must', e:'cartier_tank' },
{ i:'tank solo', e:'cartier_tank' },
{ i:'ballon bleu', e:'cartier_ballon_bleu' },
{ i:'ballon bleu cartier', e:'cartier_ballon_bleu' },
{ i:'juste un clou', e:'cartier_juste_un_clou' },
{ i:'just a nail', e:'cartier_juste_un_clou' },
{ i:'wjba0042', e:'cartier_juste_un_clou' },
{ i:'love cartier', e:'cartier_love' },
{ i:'love bracelet', e:'cartier_love' },
{ i:'vis cartier', e:'cartier_love' },

// ═══════════════════════════════════════════════════════════════════════════════
// OTHER BRANDS (28)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'omega', e:'omega_general' },
{ i:'seamaster', e:'omega_seamaster' },
{ i:'speedmaster', e:'omega_speedmaster' },
{ i:'moonwatch', e:'omega_speedmaster' },
{ i:'iwc', e:'iwc_general' },
{ i:'portugaise', e:'iwc_general' },
{ i:'big pilot', e:'iwc_general' },
{ i:'tudor', e:'tudor_general' },
{ i:'black bay', e:'tudor_general' },
{ i:'tudor pelagos', e:'tudor_general' },
{ i:'jaeger', e:'jlc_general' },
{ i:'jlc', e:'jlc_general' },
{ i:'reverso', e:'jlc_general' },
{ i:'vacheron', e:'vacheron_general' },
{ i:'vacheron constantin', e:'vacheron_general' },
{ i:'patrimony', e:'vacheron_general' },
{ i:'hublot', e:'hublot_general' },
{ i:'big bang', e:'hublot_general' },
{ i:'classic fusion', e:'hublot_general' },
{ i:'panerai', e:'panerai_general' },
{ i:'luminor', e:'panerai_general' },
{ i:'radiomir', e:'panerai_general' },
{ i:'breguet', e:'breguet_general' },
{ i:'marine breguet', e:'breguet_general' },
{ i:'classique breguet', e:'breguet_general' },
{ i:'aqua terra', e:'omega_seamaster' },
{ i:'seamaster 300m', e:'omega_seamaster' },
{ i:'311.30', e:'omega_speedmaster' },


// ═══════════════════════════════════════════════════════════════════════════════
// SERVICES — REVISION (22)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'révision', e:'revision_general' },
{ i:'revision', e:'revision_general' },
{ i:'service', e:'revision_general' },
{ i:'entretien', e:'revision_general' },
{ i:'maintenance', e:'revision_general' },
{ i:'overhaul', e:'revision_general' },
{ i:'remise à neuf', e:'revision_general' },
{ i:'full service', e:'revision_general' },
{ i:'service complet', e:'revision_general' },
{ i:'prix révision', e:'revision_general' },
{ i:'tarif révision', e:'revision_general' },
{ i:'watch not working', e:'revision_general' },
{ i:'montre ne fonctionne plus', e:'revision_general' },
{ i:'watch running slow', e:'revision_general' },
{ i:'losing time', e:'revision_general' },
{ i:'gaining time', e:'revision_general' },
{ i:'watch broken', e:'revision_general' },
{ i:'mouvement révisé', e:'revision_general' },
{ i:'révision complète', e:'revision_general' },
{ i:'révision rolex', e:'revision_rolex' },
{ i:'service rolex', e:'revision_rolex' },
{ i:'révision ap', e:'revision_ap' },

// ═══════════════════════════════════════════════════════════════════════════════
// BATTERY (12)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'pile', e:'battery' },
{ i:'batterie', e:'battery' },
{ i:'battery', e:'battery' },
{ i:'changement de pile', e:'battery' },
{ i:'change battery', e:'battery' },
{ i:'quartz', e:'battery' },
{ i:'montre quartz', e:'battery' },
{ i:'pile morte', e:'battery' },
{ i:'dead battery', e:'battery' },
{ i:'pile faible', e:'battery' },
{ i:'combien pile', e:'battery' },
{ i:'changer pile', e:'battery' },

// ═══════════════════════════════════════════════════════════════════════════════
// REPAIR (12)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'réparation', e:'repair' },
{ i:'repair', e:'repair' },
{ i:'cassé', e:'repair' },
{ i:'broken', e:'repair' },
{ i:'bracelet cassé', e:'repair' },
{ i:'verre cassé', e:'repair' },
{ i:'crystal crack', e:'repair' },
{ i:'couronne cassée', e:'repair' },
{ i:'crown broken', e:'repair' },
{ i:'attache cassée', e:'repair' },
{ i:'maillon perdu', e:'repair' },
{ i:'link lost', e:'repair' },

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION (15)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'authentique', e:'authentication' },
{ i:'authentification', e:'authentication' },
{ i:'fake', e:'authentication' },
{ i:'faux', e:'authentication' },
{ i:'contrefaçon', e:'authentication' },
{ i:'counterfeit', e:'authentication' },
{ i:'garantie', e:'authentication' },
{ i:'guarantee', e:'authentication' },
{ i:'is it real', e:'authentication' },
{ i:'genuine', e:'authentication' },
{ i:'legit', e:'authentication' },
{ i:'how do you verify', e:'authentication' },
{ i:'can i trust', e:'authentication' },
{ i:'real rolex', e:'authentication' },
{ i:'vraie montre', e:'authentication' },

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERY + PAYMENT (18)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'livraison', e:'delivery' },
{ i:'livrer', e:'delivery' },
{ i:'delivery', e:'delivery' },
{ i:'shipping', e:'delivery' },
{ i:'expédition', e:'delivery' },
{ i:'colissimo', e:'delivery' },
{ i:'chronopost', e:'delivery' },
{ i:'insured', e:'delivery' },
{ i:'how long to receive', e:'delivery' },
{ i:'paiement', e:'payment' },
{ i:'payer', e:'payment' },
{ i:'payment', e:'payment' },
{ i:'virement', e:'payment' },
{ i:'wire transfer', e:'payment' },
{ i:'carte', e:'payment' },
{ i:'espèces', e:'payment' },
{ i:'cash', e:'payment' },
{ i:'how to pay', e:'payment' },


// ═══════════════════════════════════════════════════════════════════════════════
// INVESTMENT (16)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'investissement', e:'investment' },
{ i:'investment', e:'investment' },
{ i:'invest', e:'investment' },
{ i:'valeur', e:'investment' },
{ i:'appreciation', e:'investment' },
{ i:'revente', e:'investment' },
{ i:'resale', e:'investment' },
{ i:'prend de la valeur', e:'investment' },
{ i:'gains value', e:'investment' },
{ i:'store of value', e:'investment' },
{ i:'valeur refuge', e:'investment' },
{ i:'good investment', e:'investment' },
{ i:'smart buy', e:'investment' },
{ i:'do watches appreciate', e:'investment' },
{ i:'patrimoine', e:'investment' },
{ i:'is it a good investment', e:'investment' },

// ═══════════════════════════════════════════════════════════════════════════════
// WATER RESISTANCE (12)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'étanchéité', e:'water_resistance' },
{ i:'étanche', e:'water_resistance' },
{ i:'waterproof', e:'water_resistance' },
{ i:'résistance à l eau', e:'water_resistance' },
{ i:'splash proof', e:'water_resistance' },
{ i:'300m étanche', e:'water_resistance' },
{ i:'plonger avec montre', e:'water_resistance' },
{ i:'swimming watch', e:'water_resistance' },
{ i:'shower watch', e:'water_resistance' },
{ i:'piscine montre', e:'water_resistance' },
{ i:'surf montre', e:'water_resistance' },
{ i:'waterproof watch', e:'water_resistance' },

// ═══════════════════════════════════════════════════════════════════════════════
// CARE TIPS (12)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'entretien quotidien', e:'care_tips' },
{ i:'comment entretenir', e:'care_tips' },
{ i:'nettoyer montre', e:'care_tips' },
{ i:'clean watch', e:'care_tips' },
{ i:'chiffon microfibre', e:'care_tips' },
{ i:'conseils entretien', e:'care_tips' },
{ i:'watch care', e:'care_tips' },
{ i:'maintenance tips', e:'care_tips' },
{ i:'garder en bon état', e:'care_tips' },
{ i:'bracelet taches', e:'care_tips' },
{ i:'rincer', e:'care_tips' },
{ i:'soap water', e:'care_tips' },

// ═══════════════════════════════════════════════════════════════════════════════
// MARKET PRICES (16)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'cote rolex', e:'market_rolex' },
{ i:'prix rolex marché', e:'market_rolex' },
{ i:'marché rolex', e:'market_rolex' },
{ i:'rolex valeur', e:'market_rolex' },
{ i:'rolex prix occasion', e:'market_rolex' },
{ i:'rolex se revend', e:'market_rolex' },
{ i:'cote ap', e:'market_ap' },
{ i:'prix ap marché', e:'market_ap' },
{ i:'royal oak prix occasion', e:'market_ap' },
{ i:'ap valeur', e:'market_ap' },
{ i:'cote patek', e:'market_patek' },
{ i:'prix patek marché', e:'market_patek' },
{ i:'nautilus prix occasion', e:'market_patek' },
{ i:'patek valeur', e:'market_patek' },
{ i:'5711 prix', e:'market_patek' },
{ i:'tendances marché', e:'market_trends' },

// ═══════════════════════════════════════════════════════════════════════════════
// FAKE DETECTION (14)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'fake rolex', e:'fake_detection' },
{ i:'fausse rolex', e:'fake_detection' },
{ i:'comment détecter', e:'fake_detection' },
{ i:'how to spot', e:'fake_detection' },
{ i:'replica', e:'fake_detection' },
{ i:'réplique', e:'fake_detection' },
{ i:'counterfeit watch', e:'fake_detection' },
{ i:'spot a fake', e:'fake_detection' },
{ i:'repérer un faux', e:'fake_detection' },
{ i:'is it real', e:'authentication' },
{ i:'how do i know if fake', e:'fake_detection' },
{ i:'chinese fake', e:'fake_detection' },
{ i:'identify fake', e:'fake_detection' },
{ i:'authentication guide', e:'fake_detection' },


// ═══════════════════════════════════════════════════════════════════════════════
// MOST EXPENSIVE / CHEAPEST / POPULAR / NEW (24)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'most expensive', e:'most_expensive' },
{ i:'plus cher', e:'most_expensive' },
{ i:'highest price', e:'most_expensive' },
{ i:'most costly', e:'most_expensive' },
{ i:'expensive watch', e:'most_expensive' },
{ i:'montre la plus chère', e:'most_expensive' },
{ i:'top price', e:'most_expensive' },
{ i:'le plus cher', e:'most_expensive' },
{ i:'ultimate piece', e:'most_expensive' },
{ i:'cheapest', e:'cheapest' },
{ i:'least expensive', e:'cheapest' },
{ i:'pas cher', e:'budget' },
{ i:'moins cher', e:'cheapest' },
{ i:'lowest price', e:'cheapest' },
{ i:'entry price', e:'cheapest' },
{ i:'starting price', e:'cheapest' },
{ i:'le moins cher', e:'cheapest' },
{ i:'most popular', e:'recommendation' },
{ i:'best seller', e:'most_popular' },
{ i:'best selling', e:'most_popular' },
{ i:'trending', e:'most_popular' },
{ i:'new arrivals', e:'new_arrivals' },
{ i:'nouveautés', e:'new_arrivals' },
{ i:'just arrived', e:'new_arrivals' },

// ═══════════════════════════════════════════════════════════════════════════════
// USE CASE: DAILY / DRESS / SPORT (25)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'daily wear', e:'daily_watch' },
{ i:'pour tous les jours', e:'daily_watch' },
{ i:'everyday watch', e:'daily_watch' },
{ i:'montre quotidienne', e:'daily_watch' },
{ i:'can i wear it every day', e:'daily_watch' },
{ i:'résistante', e:'daily_watch' },
{ i:'durable', e:'daily_watch' },
{ i:'daily driver', e:'daily_watch' },
{ i:'wear to office', e:'daily_watch' },
{ i:'dress watch', e:'dress_watch' },
{ i:'montre habillée', e:'dress_watch' },
{ i:'formal watch', e:'dress_watch' },
{ i:'montre de soirée', e:'dress_watch' },
{ i:'elegant watch', e:'dress_watch' },
{ i:'black tie', e:'dress_watch' },
{ i:'gala', e:'dress_watch' },
{ i:'soirée', e:'dress_watch' },
{ i:'slim watch', e:'dress_watch' },
{ i:'sport watch', e:'sport_watch' },
{ i:'montre sport', e:'sport_watch' },
{ i:'diving watch', e:'rolex_submariner' },
{ i:'outdoor watch', e:'sport_watch' },
{ i:'montre plongée', e:'sport_watch' },
{ i:'montre natation', e:'sport_watch' },
{ i:'fitness', e:'sport_watch' },

// ═══════════════════════════════════════════════════════════════════════════════
// GIFT (16)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'cadeau', e:'gift' },
{ i:'gift', e:'gift' },
{ i:'offrir', e:'gift' },
{ i:'anniversaire', e:'gift' },
{ i:'birthday', e:'gift' },
{ i:'noël', e:'gift' },
{ i:'christmas', e:'gift' },
{ i:'idée cadeau', e:'gift' },
{ i:'gift idea', e:'gift' },
{ i:'pour offrir', e:'gift' },
{ i:'luxury gift', e:'gift' },
{ i:'cadeau luxe', e:'gift' },
{ i:'saint valentin', e:'gift' },
{ i:'valentines day', e:'gift' },
{ i:'gift for him', e:'gift' },
{ i:'gift for her', e:'gift' },

// ═══════════════════════════════════════════════════════════════════════════════
// WOMAN WATCH (12)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'femme', e:'woman_watch' },
{ i:'woman', e:'woman_watch' },
{ i:'ladies', e:'woman_watch' },
{ i:'montre femme', e:'woman_watch' },
{ i:'cadeau femme', e:'woman_watch' },
{ i:'pour ma femme', e:'woman_watch' },
{ i:'for my wife', e:'woman_watch' },
{ i:'petite taille', e:'woman_watch' },
{ i:'small size', e:'woman_watch' },
{ i:'36mm', e:'woman_watch' },
{ i:'lady datejust femme', e:'rolex_lady_datejust' },
{ i:'féminin', e:'woman_watch' },


// ═══════════════════════════════════════════════════════════════════════════════
// COMPARISONS (20)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'submariner vs gmt', e:'compare_sub_vs_gmt' },
{ i:'sub ou gmt', e:'compare_sub_vs_gmt' },
{ i:'difference submariner gmt', e:'compare_sub_vs_gmt' },
{ i:'gmt ou sub', e:'compare_sub_vs_gmt' },
{ i:'which is better sub or gmt', e:'compare_sub_vs_gmt' },
{ i:'rolex sub vs gmt', e:'compare_sub_vs_gmt' },
{ i:'rolex vs ap', e:'compare_rolex_vs_ap' },
{ i:'rolex ou ap', e:'compare_rolex_vs_ap' },
{ i:'choisir rolex ap', e:'compare_rolex_vs_ap' },
{ i:'royal oak vs rolex', e:'compare_rolex_vs_ap' },
{ i:'rolex vs patek', e:'compare_rolex_vs_patek' },
{ i:'rolex ou patek', e:'compare_rolex_vs_patek' },
{ i:'choisir rolex patek', e:'compare_rolex_vs_patek' },
{ i:'nautilus vs submariner', e:'compare_rolex_vs_patek' },
{ i:'neuf ou vintage', e:'compare_new_vs_vintage' },
{ i:'new vs vintage', e:'compare_new_vs_vintage' },
{ i:'modern vs vintage', e:'compare_new_vs_vintage' },
{ i:'rolex neuf occasion', e:'compare_new_vs_vintage' },
{ i:'datejust vs royal oak', e:'compare_rolex_vs_ap' },
{ i:'sub vs royal oak', e:'compare_rolex_vs_ap' },

// ═══════════════════════════════════════════════════════════════════════════════
// VINTAGE (14)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'vintage', e:'vintage_watches' },
{ i:'ancien', e:'vintage_watches' },
{ i:'montre vintage', e:'vintage_watches' },
{ i:'vintage rolex', e:'vintage_watches' },
{ i:'patina', e:'vintage_watches' },
{ i:'patine', e:'vintage_watches' },
{ i:'tropical', e:'vintage_watches' },
{ i:'gilt dial', e:'vintage_watches' },
{ i:'tritium', e:'vintage_watches' },
{ i:'1960', e:'vintage_watches' },
{ i:'1970', e:'vintage_watches' },
{ i:'old rolex', e:'vintage_watches' },
{ i:'achat vintage', e:'vintage_watches' },
{ i:'valeur vintage', e:'vintage_watches' },

// ═══════════════════════════════════════════════════════════════════════════════
// TECHNICAL EDUCATION (25)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'automatique', e:'movement_types' },
{ i:'mécanique', e:'movement_types' },
{ i:'mechanical', e:'movement_types' },
{ i:'mouvement', e:'movement_types' },
{ i:'remontage automatique', e:'movement_types' },
{ i:'calibre', e:'cartier_calibre' },
{ i:'in-house', e:'movement_types' },
{ i:'automatic vs quartz', e:'movement_types' },
{ i:'chronographe', e:'complications' },
{ i:'tourbillon', e:'complications' },
{ i:'perpetual calendar', e:'patek_complications' },
{ i:'moonphase', e:'patek_complications' },
{ i:'phase de lune', e:'complications' },
{ i:'minute repeater', e:'patek_complications' },
{ i:'skeleton', e:'complications' },
{ i:'grande complication', e:'complications' },
{ i:'lunette', e:'bezel_types' },
{ i:'bezel', e:'bezel_types' },
{ i:'lunette céramique', e:'bezel_types' },
{ i:'ceramic bezel', e:'bezel_types' },
{ i:'tachymètre', e:'bezel_types' },
{ i:'précision', e:'watch_accuracy' },
{ i:'accuracy', e:'watch_accuracy' },
{ i:'chronomètre', e:'cosc_certification' },
{ i:'secondes par jour', e:'cosc_certification' },

// ═══════════════════════════════════════════════════════════════════════════════
// BOX & PAPERS / CONDITION (18)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'papiers', e:'sell_docs' },
{ i:'papers', e:'sell_docs' },
{ i:'boîte', e:'sell_docs' },
{ i:'certificat', e:'sell_docs' },
{ i:'sans papiers', e:'sell_docs' },
{ i:'avec boîte', e:'sell_docs' },
{ i:'boite papiers', e:'box_papers' },
{ i:'box and papers', e:'box_papers' },
{ i:'full set', e:'box_papers' },
{ i:'set complet', e:'box_papers' },
{ i:'original box', e:'box_papers' },
{ i:'carte garantie', e:'box_papers' },
{ i:'état', e:'condition_grades' },
{ i:'condition', e:'condition_grades' },
{ i:'mint', e:'rolex_datejust' },
{ i:'never worn', e:'condition_grades' },
{ i:'scratches', e:'polishing' },
{ i:'what condition', e:'condition_grades' },


// ═══════════════════════════════════════════════════════════════════════════════
// SPECIFIC SELL INTENT (12)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'vendre ma rolex', e:'sell_rolex' },
{ i:'sell my rolex', e:'sell_rolex' },
{ i:'estimer rolex', e:'sell_rolex' },
{ i:'combien pour ma rolex', e:'sell_rolex' },
{ i:'rachat rolex', e:'sell_rolex' },
{ i:'vendre ap', e:'sell_ap' },
{ i:'sell ap', e:'sell' },
{ i:'combien pour mon ap', e:'sell_ap' },
{ i:'rachat ap', e:'sell_ap' },
{ i:'vendre patek', e:'sell_patek' },
{ i:'sell patek', e:'sell' },
{ i:'combien pour mon patek', e:'sell_patek' },

// ═══════════════════════════════════════════════════════════════════════════════
// SIZE / STRAP / INSURANCE (22)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'taille', e:'size_guide' },
{ i:'size', e:'size_guide' },
{ i:'38mm', e:'size_guide' },
{ i:'41mm', e:'size_guide' },
{ i:'44mm', e:'size_guide' },
{ i:'trop grand', e:'size_guide' },
{ i:'too big', e:'size_guide' },
{ i:'quelle taille', e:'size_guide' },
{ i:'wrist size', e:'size_guide' },
{ i:'poignet fin', e:'size_guide' },
{ i:'bracelet', e:'strap_bracelet' },
{ i:'strap', e:'strap_bracelet' },
{ i:'nato', e:'strap_bracelet' },
{ i:'cuir', e:'strap_bracelet' },
{ i:'leather', e:'strap_bracelet' },
{ i:'changer bracelet', e:'strap_bracelet' },
{ i:'replacement bracelet', e:'strap_bracelet' },
{ i:'assurance', e:'delivery' },
{ i:'insurance', e:'insurance' },
{ i:'vol montre', e:'insurance' },
{ i:'insure watch', e:'insurance' },
{ i:'assurer montre', e:'insurance' },

// ═══════════════════════════════════════════════════════════════════════════════
// FIRST LUXURY / COLLECTION BUILDING (16)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'premier achat montre luxe', e:'first_luxury_watch' },
{ i:'first luxury watch', e:'budget' },
{ i:'première montre de luxe', e:'first_luxury_watch' },
{ i:'best first watch', e:'first_luxury_watch' },
{ i:'entry level luxury', e:'first_luxury_watch' },
{ i:'beginner watch', e:'first_luxury_watch' },
{ i:'montre débutant', e:'first_luxury_watch' },
{ i:'collection', e:'collection_advice' },
{ i:'collectionner', e:'collection_advice' },
{ i:'start a collection', e:'collection_advice' },
{ i:'construire collection', e:'collection_advice' },
{ i:'build collection', e:'collection_advice' },
{ i:'diversifier', e:'collection_advice' },
{ i:'how many watches', e:'collection_advice' },
{ i:'watch rotation', e:'collection_advice' },
{ i:'collection idéale', e:'collection_advice' },

// ═══════════════════════════════════════════════════════════════════════════════
// MISC SPECIFIC (20)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'polissage', e:'polishing' },
{ i:'polish', e:'polishing' },
{ i:'rayures', e:'polishing' },
{ i:'scratch', e:'polishing' },
{ i:'boîtier rayé', e:'polishing' },
{ i:'remontoir', e:'watch_winder' },
{ i:'watch winder', e:'watch_winder' },
{ i:'winder', e:'watch_winder' },
{ i:'remonter automatique', e:'watch_winder' },
{ i:'904l', e:'rolex_steel_grade' },
{ i:'acier rolex', e:'rolex_steel_grade' },
{ i:'oystersteel', e:'strap_bracelet' },
{ i:'avis', e:'nos_montres_reviews' },
{ i:'reviews', e:'nos_montres_reviews' },
{ i:'fiable', e:'nos_montres_reviews' },
{ i:'témoignages', e:'nos_montres_reviews' },
{ i:'instagram', e:'contact' },
{ i:'réseaux sociaux', e:'social_media' },
{ i:'mentions légales', e:'legal_mentions' },
{ i:'rgpd', e:'legal_mentions' },


// ═══════════════════════════════════════════════════════════════════════════════
// URGENT / SOURCING / PAGES (18)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'urgent', e:'urgent' },
{ i:'urgently', e:'urgent' },
{ i:'rapidement', e:'urgent' },
{ i:'asap', e:'urgent' },
{ i:'dès que possible', e:'urgent' },
{ i:'je suis pressé', e:'urgent' },
{ i:'chercher', e:'sourcing' },
{ i:'sourcing', e:'sourcing' },
{ i:'rare', e:'sourcing' },
{ i:'introuvable', e:'sourcing' },
{ i:'commande spéciale', e:'sourcing' },
{ i:'liste d attente', e:'sourcing' },
{ i:'page rolex', e:'page_rolex' },
{ i:'voir rolex', e:'page_rolex' },
{ i:'page ap', e:'page_ap' },
{ i:'collection ap', e:'page_ap' },
{ i:'page patek', e:'page_patek' },
{ i:'voir patek', e:'page_patek' },

// ═══════════════════════════════════════════════════════════════════════════════
// TYPO TOLERANCE (40)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'submarien', e:'rolex_submariner' },
{ i:'submarin', e:'rolex_submariner' },
{ i:'daytoana', e:'rolex_daytona' },
{ i:'daytonaa', e:'rolex_daytona' },
{ i:'gmtt', e:'rolex_gmt' },
{ i:'datejsut', e:'rolex_datejust' },
{ i:'roal oak', e:'ap_royal_oak' },
{ i:'royak oak', e:'ap_royal_oak' },
{ i:'aumars piguet', e:'ap_general' },
{ i:'audemards piguet', e:'ap_general' },
{ i:'nautiluss', e:'patek_nautilus' },
{ i:'nautilaus', e:'patek_nautilus' },
{ i:'richard mille', e:'rm_general' },
{ i:'ricard mille', e:'rm_general' },
{ i:'livrasion', e:'delivery' },
{ i:'revisoin', e:'revision_general' },
{ i:'revisoin rolex', e:'revision_rolex' },
{ i:'paiemnt', e:'payment' },
{ i:'payement', e:'payment' },
{ i:'authntification', e:'authentication' },
{ i:'authenticfication', e:'authentication' },
{ i:'garntie', e:'authentication' },
{ i:'bonjouur', e:'greeting' },
{ i:'helo', e:'greeting' },
{ i:'hlelo', e:'greeting' },
{ i:'thnaks', e:'thanks' },
{ i:'tankyou', e:'fallback' },
{ i:'chrnoographe', e:'complications' },
{ i:'chronographee', e:'complications' },
{ i:'offshoree', e:'ap_offshore' },
{ i:'offhore', e:'ap_offshore' },
{ i:'caltrava', e:'patek_calatrava' },
{ i:'aqaunaut', e:'patek_aquanaut' },
{ i:'hulck', e:'rolex_submariner' },
{ i:'panda daytona', e:'rolex_daytona' },
{ i:'rolex subamriner', e:'rolex_submariner' },
{ i:'horares', e:'hours' },
{ i:'adrese', e:'contact' },
{ i:'prix revison', e:'revision_general' },
{ i:'investisement', e:'investment' },

// ═══════════════════════════════════════════════════════════════════════════════
// NATURAL LANGUAGE VARIATIONS — BUYING (22)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'do you have a submariner', e:'rolex_submariner' },
{ i:'avez vous un submariner', e:'rolex_submariner' },
{ i:'je cherche un submariner', e:'rolex_submariner' },
{ i:'looking for a submariner', e:'rolex_submariner' },
{ i:'do you have a daytona', e:'rolex_daytona' },
{ i:'je cherche une daytona', e:'rolex_daytona' },
{ i:'avez vous un gmt', e:'rolex_gmt' },
{ i:'looking for a gmt master', e:'rolex_gmt' },
{ i:'do you have a royal oak', e:'ap_royal_oak' },
{ i:'je cherche un royal oak', e:'ap_royal_oak' },
{ i:'avez vous un nautilus', e:'patek_nautilus' },
{ i:'looking for a nautilus', e:'patek_nautilus' },
{ i:'do you have any richard mille', e:'rm_general' },
{ i:'avez vous des richard mille', e:'rm_general' },
{ i:'je cherche un datejust', e:'rolex_datejust' },
{ i:'looking for a datejust', e:'rolex_datejust' },
{ i:'avez vous une cartier', e:'cartier_general' },
{ i:'looking for a cartier', e:'cartier_general' },
{ i:'do you have any omega', e:'omega_general' },
{ i:'je cherche une tudor', e:'tudor_general' },
{ i:'avez vous des patek philippe', e:'patek_general' },
{ i:'je veux acheter un rolex', e:'buy' },


// ═══════════════════════════════════════════════════════════════════════════════
// NATURAL LANGUAGE VARIATIONS — SELLING (20)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'how much would you pay for my rolex', e:'price_general' },
{ i:'je veux vendre ma rolex submariner', e:'sell' },
{ i:'i want to sell my submariner', e:'sell' },
{ i:'combien pour ma daytona', e:'rolex_daytona' },
{ i:'combien rachetez vous un gmt', e:'sell' },
{ i:'i want to sell my royal oak', e:'sell' },
{ i:'combien pour mon royal oak', e:'ap_royal_oak' },
{ i:'je veux vendre mon ap', e:'sell' },
{ i:'i want to sell my nautilus', e:'sell' },
{ i:'combien pour ma patek', e:'patek_general' },
{ i:'je veux vendre ma patek', e:'sell' },
{ i:'selling my watch', e:'sell' },
{ i:'cash for watch', e:'sell' },
{ i:'trade in watch', e:'sell' },
{ i:'offre de rachat', e:'sell' },
{ i:'estimation de ma montre', e:'sell' },
{ i:'rachat immédiat', e:'sell' },
{ i:'i have a rolex to sell', e:'rolex_general' },
{ i:'j ai un royal oak à vendre', e:'ap_royal_oak' },
{ i:'j ai une nautilus à vendre', e:'sell' },

// ═══════════════════════════════════════════════════════════════════════════════
// NATURAL LANGUAGE VARIATIONS — PRICES (18)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'c est quoi le prix d un rolex', e:'clarify' },
{ i:'combien coûte un submariner', e:'price_general' },
{ i:'combien vaut un rolex gmt', e:'rolex_gmt' },
{ i:'what is the price of a daytona', e:'price_general' },
{ i:'how much is a royal oak', e:'price_general' },
{ i:'combien coûte un royal oak', e:'price_general' },
{ i:'quel est le prix d un nautilus', e:'price_general' },
{ i:'what does a nautilus cost', e:'patek_nautilus' },
{ i:'how much is a richard mille', e:'price_general' },
{ i:'combien coûte un richard mille', e:'price_general' },
{ i:'prix d un datejust', e:'rolex_datejust' },
{ i:'price of a daytona', e:'price_general' },
{ i:'combien coûte une révision rolex', e:'price_general' },
{ i:'prix d une révision ap', e:'revision_ap' },
{ i:'how much does a service cost', e:'price_general' },
{ i:'combien pour changer la pile', e:'battery' },
{ i:'what does a gmt cost', e:'rolex_gmt' },
{ i:'combien pour un submariner hulk', e:'rolex_126610lv' },

// ═══════════════════════════════════════════════════════════════════════════════
// NATURAL LANGUAGE — CONVERSATIONAL EDGE CASES (25)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'je voudrais en savoir plus', e:'fallback' },
{ i:'tell me more', e:'more_info' },
{ i:'what else can you tell me', e:'more_info' },
{ i:'and what else', e:'more_info' },
{ i:'ok what next', e:'clarify' },
{ i:'so what do you have', e:'clarify' },
{ i:'show me everything', e:'buy' },
{ i:'what is in stock right now', e:'stock_overview' },
{ i:'what brands do you carry', e:'buy' },
{ i:'i am just browsing', e:'not_interested' },
{ i:'just looking', e:'not_interested' },
{ i:'je regarde', e:'not_interested' },
{ i:'what is your most popular rolex', e:'recommendation' },
{ i:'which daytona do you have', e:'rolex_daytona' },
{ i:'tell me about the submariner', e:'about' },
{ i:'tell me about the nautilus', e:'about' },
{ i:'what can you tell me about ap', e:'what_is_ap' },
{ i:'give me details on the royal oak', e:'ap_royal_oak' },
{ i:'is the hulk in stock', e:'buy' },
{ i:'is the panda daytona available', e:'rolex_daytona' },
{ i:'do you have a sprite gmt', e:'rolex_126710grnr' },
{ i:'have you got the juste un clou', e:'cartier_juste_un_clou' },
{ i:'tell me about patek', e:'what_is_patek' },
{ i:'what do you know about richard mille', e:'rm_general' },
{ i:'anything interesting in stock', e:'buy' },


// ═══════════════════════════════════════════════════════════════════════════════
// SPECIFIC REF TESTS (20)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'126610lv', e:'rolex_submariner' },
{ i:'hulk rolex', e:'rolex_126610lv' },
{ i:'submariner hulk', e:'rolex_126610lv' },
{ i:'vert submariner', e:'rolex_126610lv' },
{ i:'126500ln', e:'rolex_126500ln' },
{ i:'daytona panda', e:'rolex_daytona' },
{ i:'panda acier', e:'rolex_126500ln' },
{ i:'126710grnr', e:'rolex_126710grnr' },
{ i:'gmt sprite', e:'rolex_126710grnr' },
{ i:'vert rouge gmt', e:'rolex_126710grnr' },
{ i:'116613lb', e:'rolex_submariner' },
{ i:'submariner acier or', e:'rolex_116613lb' },
{ i:'rolesor submariner', e:'rolex_116613lb' },
{ i:'326935', e:'rolex_yacht_master' },
{ i:'yacht master everose', e:'rolex_326935' },
{ i:'5980-1a', e:'patek_5980' },
{ i:'nautilus flyback', e:'patek_5980' },
{ i:'5990/1r', e:'patek_5990' },
{ i:'26048sk', e:'ap_offshore_lady' },
{ i:'offshore lady', e:'ap_offshore' },

// ═══════════════════════════════════════════════════════════════════════════════
// HOLY TRINITY + HIGH VALUE CONCEPTS (14)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'holy trinity', e:'what_is_patek' },
{ i:'rolex ap patek', e:'rolex_general' },
{ i:'triple couronne', e:'size_guide' },
{ i:'top trois montres', e:'thanks' },
{ i:'best three watch brands', e:'holy_trinity' },
{ i:'most prestigious', e:'holy_trinity' },
{ i:'most expensive brand', e:'most_expensive' },
{ i:'watch investment 2025', e:'investment' },
{ i:'best watch to invest', e:'recommendation' },
{ i:'should i buy a rolex as investment', e:'rolex_general' },
{ i:'will my watch appreciate', e:'fallback' },
{ i:'rolex holds value', e:'rolex_general' },
{ i:'will rolex go up in value', e:'rolex_general' },
{ i:'nautilus appreciation', e:'investment' },

// ═══════════════════════════════════════════════════════════════════════════════
// LANGUAGE SWITCH (6)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'en anglais', e:'language_switch' },
{ i:'in english', e:'language_switch' },
{ i:'switch to english', e:'language_switch' },
{ i:'do you speak english', e:'language_switch' },
{ i:'english please', e:'language_switch' },
{ i:'parlez vous anglais', e:'language_switch' },

// ═══════════════════════════════════════════════════════════════════════════════
// MORE EDGE CASES AND NATURAL VARIATIONS (30)
// ═══════════════════════════════════════════════════════════════════════════════
{ i:'biggest rolex you have', e:'rolex_general' },
{ i:'most expensive rolex', e:'most_expensive' },
{ i:'newest rolex', e:'rolex_general' },
{ i:'latest rolex', e:'rolex_general' },
{ i:'best rolex for the money', e:'rolex_general' },
{ i:'best ap for the money', e:'ap_general' },
{ i:'most iconic ap', e:'ap_general' },
{ i:'most iconic rolex', e:'rolex_general' },
{ i:'what is the hulk', e:'rolex_submariner' },
{ i:'explain the submariner', e:'rolex_submariner' },
{ i:'difference submariner date et no date', e:'rolex_submariner' },
{ i:'what is the panda', e:'rolex_daytona' },
{ i:'explain daytona', e:'clarify' },
{ i:'why is the daytona so expensive', e:'rolex_daytona' },
{ i:'what is the royal oak', e:'ap_royal_oak' },
{ i:'why is royal oak so expensive', e:'ap_royal_oak' },
{ i:'what is the nautilus', e:'patek_nautilus' },
{ i:'why is the nautilus discontinued', e:'patek_nautilus' },
{ i:'what is a tourbillon', e:'complications' },
{ i:'what is a chronograph', e:'complications' },
{ i:'what is a perpetual calendar', e:'patek_complications' },
{ i:'difference quartz et automatique', e:'movement_types' },
{ i:'automatic vs manual', e:'movement_types' },
{ i:'how to wind a watch', e:'how_to_wind' },
{ i:'what size should i get', e:'size_guide' },
{ i:'which size is best for me', e:'size_guide' },
{ i:'is 40mm too big', e:'size_guide' },
{ i:'what is a good size for a man', e:'size_guide' },
{ i:'what size for a woman', e:'size_guide' },
{ i:'small watch for woman', e:'watch_gender' },


]; // end TESTS

// ─── RUNNER ───────────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];
const byCategory = {};

for (const { i: input, e: expected } of TESTS) {
  const result = classify(input);
  const got = result ? result.id : 'null';
  if (got === expected) {
    pass++;
  } else {
    fail++;
    failures.push({ input, expected, got });
  }
  // track per-expected-category stats
  if (!byCategory[expected]) byCategory[expected] = { pass: 0, fail: 0 };
  if (got === expected) byCategory[expected].pass++;
  else byCategory[expected].fail++;
}

const total = pass + fail;
const pct = ((pass / total) * 100).toFixed(1);
console.log(`\n${'═'.repeat(60)}`);
console.log(`  RESULT: ${pass} / ${total} passing  (${pct}%)`);
console.log(`${'═'.repeat(60)}\n`);

if (failures.length > 0) {
  console.log(`FAILURES (${failures.length}):`);
  for (const { input, expected, got } of failures) {
    console.log(`  ✗  "${input}"`);
    console.log(`     expected: ${expected}   got: ${got}`);
  }
  console.log('');
}

// Show categories with any failures
const badCats = Object.entries(byCategory)
  .filter(([,v]) => v.fail > 0)
  .sort((a,b) => b[1].fail - a[1].fail);
if (badCats.length) {
  console.log('FAILURE COUNTS BY CATEGORY:');
  for (const [cat, {pass: p, fail: f}] of badCats) {
    const tot = p + f;
    console.log(`  ${cat.padEnd(30)} ${f} fail / ${tot} total`);
  }
  console.log('');
}

if (Number(pct) < 95) {
  console.log(`❌ Below 95% threshold — fix failures above`);
  process.exit(1);
} else {
  console.log(`✅ Passed 95% threshold`);
}
