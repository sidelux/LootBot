/*

Mob Generator by @Delooo

var mobGenerator = require('./mobGenerator.js');
mobGenerator.generate();

*/

LanguageRules = {
  code: "it",
  verbsGoAfterNoun: false,
  useLowercaseNouns: false,
  useLowercaseVerbs: false,
  doubleIntervocalicRs: false,
  doubleIntervocalicSs: false,
  hyphenateCompoundNouns: false,
  useUppercaseAfterHyphens: false,
  hyphenateCompoundNounsWithDoubleLetters: true,
  dontUseBasePartsAsAdjectives: false,
  addArticlesToNames: false,
  removeAllSpaces: false,
  ignoreParentheses: false
};

complexity = 1.0;
activeGender = 0;
activeAdjectivePlacement = 0;

CurrentLexiconLists = {
  Adjectives_beforeNoun_gender1: ["Gigantesco", "Piccolo", "Bavoso", "Fetido"],
  Adjectives_afterNoun_gender1: [
    "della foresta",
    "delle terre dei Grumpi",
    "delle grandi vallate",
    "del popolo del vulcano",
    "dai confini del mondo",
    "affamato",
    "arrabbiato",
    "furioso",
    "docile",
    "in preda al panico",
    "armato",
    "disarmato",
    "zombie",
    "impietrito",
    "logorato",
    "sfregiato",
    "stanco",
    "esausto",
    "assassino",
    "divertito",
    "aggressivo",
    "di metallo",
    "di fuoco",
    "verde",
    "rosso",
    "blu",
    "confuso",
    "contorto",
    "mutante",
    "simpatico",
    "suicida",
    "malintenzionato",
    "possente",
    "appiccicoso",
    "fantasmagorico",
    "barbuto",
    "belga",
    "bendato",
    "bulboso",
    "Edoriano",
    "esplosivo",
    "dal fiato letale",
    "pazzo",
    "giovane",
    "importante",
    "cinguettante",
    "contaminato",
    "criptico",
    "debole",
    "del potere",
    "sdentato",
    "di Lootia",
    "di Efesto",
    "di Zeus",
    "di Poseidone",
    "eccentrico",
    "ecologico",
    "etereo",
    "extralarge",
    "flessibile",
    "forte",
    "geneticamente modificato",
    "improbabile",
    "ingrassato",
    "lunare",
    "maggiore",
    "magnetico",
    "meccanico",
    "medio",
    "mercuriale",
    "miniaturizzato",
    "minore",
    "modificato",
    "nervoso",
    "novizio",
    "oscuro",
    "omicida",
    "paranormale",
    "peculiare",
    "perplesso",
    "pirotecnico",
    "potenziato",
    "radioattivo",
    "raffreddato",
    "rivoluzionario",
    "rotante",
    "rotolante",
    "rumoroso",
    "robotico",
    "sbadato",
    "silenzioso",
    "sonico",
    "spadaccino",
    "spaziale",
    "stellare",
    "striato",
    "sudato",
    "trasparente",
    "volante",
    "violento",
    "zoppicante",
    "quadridimensionale"
  ],
  Adjectives_beforeNoun_gender2: ["Piccola", "Grande", "Strana", "Incantevole"],
  Adjectives_afterNoun_gender2: [
    "della foresta",
    "delle terre dei Grumpi",
    "delle grandi vallate",
    "del popolo del vulcano",
    "delle vallate impervie",
    "affamata",
    "arrabbiata",
    "furiosa",
    "docile",
    "in preda al panico",
    "armata",
    "disarmata",
    "zombie",
    "impietrita",
    "logorata",
    "sfregiata",
    "stanca",
    "esausta",
    "assassina",
    "divertita",
    "aggressiva",
    "di metallo",
    "di fuoco",
    "verde",
    "rossa",
    "blu",
    "confusa",
    "contorta",
    "mutante",
    "simpatica",
    "suicida",
    "malintenzionata",
    "possente",
    "appiccicosa",
    "fantasmagorica",
    "barbuta",
    "belga",
    "bendata",
    "bulbosa",
    "Edoriana",
    "esplosiva",
    "dal fiato letale",
    "pazza",
    "importante",
    "cinguettante",
    "contaminata",
    "criptica",
    "debole",
    "del potere",
    "sdentata",
    "di Lootia",
    "di Efesto",
    "di Zeus",
    "di Poseidone",
    "eccentrica",
    "ecologica",
    "eterea",
    "extralarge",
    "flessibile",
    "forte",
    "geneticamente modificata",
    "improbabile",
    "ingrassata",
    "lunare",
    "maggiore",
    "magnetica",
    "meccanica",
    "media",
    "mercuriale",
    "miniaturizzata",
    "minore",
    "modificata",
    "nervosa",
    "novizia",
    "oscura",
    "omicida",
    "paranormale",
    "peculiare",
    "perplessa",
    "pirotecnica",
    "potenziata",
    "radioattiva",
    "raffreddata",
    "rivoluzionaria",
    "rotante",
    "rotolante",
    "rumorosa",
    "robotica",
    "sbadata",
    "silenziosa",
    "sonica",
    "spaziale",
    "stellare",
    "striata",
    "trasparente",
    "volante",
    "violenta",
    "zoppicante",
    "quadridimensionale"
  ],
  Adjectives_beforeNoun_gender3: [],
  Adjectives_afterNoun_gender3: [],
  Nouns_gender1: [
    "nano",
    "orco",
    "scheletro",
    "mostro",
    "bardo",
    "demone",
    "troll",
    "goblin",
    "elfo",
    "gigante",
    "guerriero",
    "golem",
    "drago",
    "falciatore",
    "arciere",
    "soldato",
    "cannoniere",
    "artigliere",
    "distruttore",
    "frantumateste",
    "divoratore",
    "giullare",
    "pazzoide",
    "ninja",
    "serpente",
    "essere",
    "cavaliere",
    "barbaro",
    "centauro",
    "mercenario",
    "lanciere",
    "lottatore",
    "evocatore",
    "licantropo",
    "gargoyle",
    "zombie",
    "mago",
    "stregone",
    "mech",
    "martellatore",
    "tiratore",
    "caposcout"
  ],
  Nouns_gender2: [
    "valchiria",
    "viverna",
    "guardia",
    "mangiauomini",
    "pianta carnivora",
    "ubriacona",
    "combattente",
    "vichinga",
    "strega",
    "maga",
    "sferragliatrice",
    "macellaia",
    "sacerdotessa",
    "ribelle",
    "bestia"
  ],
  Nouns_gender3: [],
  CompoundAdjectives_prefix: [],
  CompoundAdjectives_base_beforeNoun_gender1: [],
  CompoundAdjectives_base_afterNoun_gender1: [],
  CompoundAdjectives_base_beforeNoun_gender2: [],
  CompoundAdjectives_base_afterNoun_gender2: [],
  CompoundAdjectives_base_beforeNoun_gender3: [],
  CompoundAdjectives_base_afterNoun_gender3: [],
  CompoundNouns_prefix: [],
  CompoundNouns_base_gender1: [],
  CompoundNouns_base_gender2: [],
  CompoundNouns_base_gender3: []
};

function setCurrentLexiconLists(lists) {
  CurrentLexiconLists = lists; //CurrentLexiconLists è un oggetto i cui attributi sono categorie ovvero array di parole
}

function getWordList(wordListId) {
  var wordList = CurrentLexiconLists[wordListId];
  return wordList;
}

function generateMobCompleteName() {
  var name;
  var x = getRandomInt(0, 3);
  if (x == 0) {
    name = GetShortRandomName();
  } else if (x == 1) {
    name = GetMediumRandomName();
  } else if (x == 2) {
    name = GetLongRandomName();
  }

  return name;
}

function isValidWordList(list) {
  return list && list.length > 0 && list[0].length > 0;
}

function hasCompoundNouns() {
  return false;
}

function hasCompoundAdjectives() {
  return false;
}

function GetRandomNoun() {
  var base;
  base = GetRandomNounWord();
  return base;
}

function GetRandomLocalizedWord(genderLists, cmplx) {
  if (activeGender == 0) {
    var totalWords = countOfAllLists(genderLists);
    var n = getRandomInt(0, totalWords);
    activeGender = listIndexOfItemIndex(genderLists, n) + 1;
  }

  return GetRandomLocalizedWordForGender(genderLists, activeGender, cmplx);
}

function GetRandomLocalizedWordForGender(genderLists, gender, cmplx) {
  if (genderLists.length <= 3) {
    if (isValidWordList(genderLists[gender - 1]))
      return randomWordFrom(genderLists[gender - 1], cmplx);
    else {
      // If there's no gender-specialization for this list, use the default gender
      if (isValidWordList(genderLists[0])) {
        return GetRandomLocalizedWordForGender(genderLists, 1, cmplx);
      } else {
        return "";
      }
    }
  } else {
    gender -= gender > 3 ? 3 : 0;
    var genderSpecificLists = [];
    if (
      isValidWordList(genderLists[gender - 1]) ||
      isValidWordList(genderLists[gender + 3 - 1])
    ) {
      genderSpecificLists.push(genderLists[gender - 1]);
      genderSpecificLists.push(genderLists[gender + 3 - 1]);

      var totalGenderSpecificWords = countOfAllLists(genderSpecificLists);
      var n = getRandomInt(0, totalGenderSpecificWords);
      activeAdjectivePlacement = listIndexOfItemIndex(genderSpecificLists, n);

      return randomWordFrom(
        genderSpecificLists[activeAdjectivePlacement],
        cmplx
      );
    } else {
      // If there's no gender-specialization for this list, use the default gender
      if (isValidWordList(genderLists[0]))
        return GetRandomLocalizedWordForGender(genderLists, 1, cmplx);
      else return "";
    }
  }
}

function GetRandomAdjective() {
  var adjective = new Object();
  adjective.word = "";
  adjective.comesBeforeNoun = true;

  adjective.word = GetRandomLocalizedWord(
    [
      getWordList("Adjectives_beforeNoun_gender1"),
      getWordList("Adjectives_beforeNoun_gender2"),
      getWordList("Adjectives_beforeNoun_gender3"),
      getWordList("Adjectives_afterNoun_gender1"),
      getWordList("Adjectives_afterNoun_gender2"),
      getWordList("Adjectives_afterNoun_gender3")
    ],
    complexity
  );

  if (activeAdjectivePlacement == 1) {
    adjective.comesBeforeNoun = false;
    if (activeGender > 3) {
      activeGender -= 3;
    }
  }
  return adjective;
}

function GetRandomNounWord() {
  return GetRandomLocalizedWord(
    [
      getWordList("Nouns_gender1"),
      getWordList("Nouns_gender2"),
      getWordList("Nouns_gender3")
    ],
    complexity
  );
}

function GetShortRandomName() {
  return GetMediumRandomName();
}

function GetMediumRandomName() {
  var name;
  var noun = GetRandomNoun();
  var adjective = GetRandomAdjective();

  var firstPart = adjective.comesBeforeNoun ? adjective.word : noun;
  var lastPart = adjective.comesBeforeNoun ? noun : adjective.word;

  if (firstPart.length == 0) name = upperCaseFirstLetter(lastPart);
  else if (lastPart.length == 0) name = upperCaseFirstLetter(firstPart);
  else {
    var separator = " ";
    name = upperCaseFirstLetter(firstPart) + separator + lastPart;
  }

  return name;
}

function GetLongRandomName() {
  var name;
  var adjective = GetRandomAdjective();
  var noun = GetRandomNoun();

  var firstPart = adjective.comesBeforeNoun ? adjective.word : noun;
  var lastPart = adjective.comesBeforeNoun ? noun : adjective.word;

  if (firstPart.length == 0) name = upperCaseFirstLetter(lastPart);
  else if (lastPart.length == 0) name = upperCaseFirstLetter(firstPart);
  else {
    var separator = " ";
    name = upperCaseFirstLetter(firstPart) + separator + lastPart;
  }

  return name;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function randomIndexFrom(wordList, cmplx) {
  var a = wordList.length * 0.5;
  var b = wordList.length;
  var upperBound = Math.floor(a + cmplx * (b - a));
  var wordIndex = getRandomInt(0, upperBound);
  return wordIndex;
}

function randomWordFrom(wordList, cmplx) {
  if (cmplx == undefined) cmplx = 1;
  var n = randomIndexFrom(wordList, cmplx);
  var word = wordList[n];
  return word;
}

function processLanguageRules(name) {
  return removeParenthesizedWords(name);
}

function removeParenthesizedWords(text) {
  var openParenIndex = text.indexOf("(");
  var closeParenIndex = text.indexOf(")");

  if (openParenIndex != -1 && closeParenIndex != -1) {
    var removalEndIndex = closeParenIndex;
    var nextChar = text[closeParenIndex + 1];
    if (nextChar == " ") removalEndIndex += 1; // Also remove the space
    return text.slice(0, openParenIndex) + text.slice(removalEndIndex + 1);
  } else return text;
}

function sortByStringLength(a, b) {
  if (a.length < b.length) return -1;
  else if (a.length == b.length) return 0;
  else if (a.length > b.length) return 1;
}

function lowerCaseFirstLetter(word) {
  return word[0].toLowerCase() + word.substring(1);
}

function upperCaseFirstLetter(word) {
  return word[0].toUpperCase() + word.substring(1);
}

function isVowel(c) {
  var vowels = "aeiou";
  return vowels.indexOf(c) != -1;
}

function countOfAllLists(lists) {
  var total = 0;
  for (i = 0; i < lists.length; ++i) total += lists[i].length;
  return total;
}

function listIndexOfItemIndex(lists, n) {
  var listIndex = -1;
  for (var i = 0; i < lists.length; i++) {
    if (n < lists[i].length) {
      listIndex = i;
      break;
    } else n -= lists[i].length;
  }

  return listIndex;
}

function firstLetterOf(s) {
  return s[0];
}

function lastLetterOf(s) {
  return s[s.length - 1];
}

function reportError() {
  var breakHere = true;
}

exports.generate = function() {
  return generateMobCompleteName();
};
