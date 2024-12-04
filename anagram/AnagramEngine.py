import numpy as np
import re

class AnagramSolver:
    def __init__(self, dictionaryFilePath, excludedWordsFilePath=None, maxResults=1000):
        self.dictionaryFilePath = dictionaryFilePath
        self.excludedWordsFromFile = self.loadExcludedWords(excludedWordsFilePath) if excludedWordsFilePath is not None else []
        self.maxResults = maxResults
        self.wordList = self.loadDictionary()

    def loadDictionary(self):
        with open(self.dictionaryFilePath, 'r') as file:
            data = set(file.read().lower().split("\n"))  # unique set of lowercase words
            data = [word for word in data if word not in self.excludedWordsFromFile]  # remove excluded words
            data = [word for word in data if not (len(word) == 1 and word != 'a' and word != 'i')]
            data = [word for word in data if re.search("[aeiouy]", word)]
            data.sort(key=len, reverse=True)  # longer words first
            return data  # a list of lowercase words from longest to shortest

    def updateDictionary(self, newExcludedWords):
        # self.wordList = [word for word in self.loadDictionary() if word not in newExcludedWords]
        self.wordList = [word for word in self.wordList if word not in newExcludedWords]

    def loadExcludedWords(self, filePath):
        with open(filePath, 'r') as file:
            data = set(file.read().lower().split("\n"))  # unique set of lowercase words
            return data

    def solveAnagram(self, anagramString, excludedWords=[], requiredWords=[]):
        self.results = []
        self.updateDictionary(excludedWords)
        
        letters = list(anagramString.lower())
        
        for word in requiredWords:
            for char in word:
                letters.remove(char)

        self.expand(letters, self.wordList)
        self.results = [tuple(sorted(x + requiredWords)) for x in self.results]
        return self.results

    def showResults(self):
        count = 0
        for result in self.results:
            print(f"{count}: {result}")
            count += 1

    def expand(self, letters, wordList, foundWords=[]):
        if len(self.results) >= self.maxResults or not wordList:  # hit max results or no more words left to match
            return self.results

        intermediaries = []
        for word in wordList:
            remainingLetters = self.getRemainingLetters(letters, word)  # tries to make word out of remaining letters
            if remainingLetters is not None:  # runs if word was found
                if not remainingLetters:  # runs if all letters were used
                    result = foundWords + [word]
                    if result not in self.results:
                        self.results.append(result)
                else:  # runs if only some letters were used
                    intermediaries.append([word, remainingLetters])

        if not intermediaries:
            return

        newWordList = list(np.delete(np.array(intermediaries, dtype=object), 1, 1).T[0])  # isolated the words from remnants
        for pair in intermediaries:
            self.expand(pair[1], newWordList, foundWords + [pair[0]])

    def getRemainingLetters(self, letters, word):
        remainingLetters = letters
        for char in word:  # iterates through each character of word
            try:
                charIndex = remainingLetters.index(char)
            except ValueError:  # did not find letter in remaining anagram letters
                return None  # returns nothing
            remainingLetters = remainingLetters[:charIndex] + remainingLetters[charIndex + 1:]  # removes character if found
        return remainingLetters  # returns remaining letters after removing word

if __name__ == "__main__":
    dictFilePath = "resources/words"
    anagramString = "cheeseboy"
    requiredWords = []
    solver = AnagramSolver(dictFilePath, maxResults=100)
    solver.solveAnagram(anagramString, requiredWords=requiredWords)
    solver.showResults()