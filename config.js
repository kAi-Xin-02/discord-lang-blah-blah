const fs = require('fs');
const path = require('path');

const wordlistPath = path.join(__dirname, 'wordlist.json');

function loadWords() {
    try {
        let data = fs.readFileSync(wordlistPath, 'utf8');
        return JSON.parse(data).words;
    } catch (err) {
        return [];
    }
}

function saveWords(words) {
    fs.writeFileSync(wordlistPath, JSON.stringify({ words }, null, 2));
}

function addWord(word) {
    let words = loadWords();
    word = word.toLowerCase().trim();
    if (!words.includes(word)) {
        words.push(word);
        saveWords(words);
        return true;
    }
    return false;
}

function removeWord(word) {
    let words = loadWords();
    word = word.toLowerCase().trim();
    let index = words.indexOf(word);
    if (index > -1) {
        words.splice(index, 1);
        saveWords(words);
        return true;
    }
    return false;
}

function getWordList() {
    return loadWords();
}

const minMatchCount = 3;

function detectHinglish(text) {
    let hinglishWords = loadWords();
    let cleanText = text.toLowerCase().replace(/[^a-z\s]/g, ' ');
    let words = cleanText.split(/\s+/).filter(w => w.length > 1);
    let matchedWords = [];

    for (let word of words) {
        if (hinglishWords.includes(word)) {
            matchedWords.push(word);
        }
    }

    return {
        isHinglish: matchedWords.length >= minMatchCount,
        matchedWords: matchedWords,
        matchCount: matchedWords.length
    };
}

module.exports = {
    loadWords,
    saveWords,
    addWord,
    removeWord,
    getWordList,
    detectHinglish,
    minMatchCount,
    excludedChannels: [],
    bypassRoles: [],
    modRoles: [],
    melloUserId: '1345063203830366250',
    warningMessage: process.env.WARNING_MESSAGE || '⚠️ **English Only** | Please use English in this server!',
    timeoutDuration: parseInt(process.env.TIMEOUT_DURATION) || 60,
    warningsBeforeTimeout: 3,
    colors: {
        warning: 0xFFA500,
        deleted: 0xFF0000,
        info: 0x00BFFF,
        success: 0x00FF00
    }
};
