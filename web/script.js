// Global variables for word lists
const requiredWordsMap = new Map();
let excludedWords = [];

// Settings variables
let settings = {
    minWordLength: 3,
    maxWordLength: 15
};

// Global variables for DOM elements
let textInput;
let wordGrid;
let leftWordGrid;
let rightWordGrid;
let errorToast;
let errorMessage;
let errorOverlay;
let loadingOverlay;
let settingsModal;
let sidebarInput;
let sidebarAddButton;
let unusedCharsDisplay;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize DOM elements
    textInput = document.getElementById('text-input');
    wordGrid = document.getElementById('word-grid');
    leftWordGrid = document.getElementById('left-word-grid');
    rightWordGrid = document.getElementById('right-word-grid');
    errorToast = document.getElementById('error-toast');
    errorMessage = document.getElementById('error-text');
    errorOverlay = document.getElementById('error-overlay');
    loadingOverlay = document.getElementById('loading-overlay');
    settingsModal = document.getElementById('settings-modal');
    sidebarInput = document.querySelector('.sidebar-text-input');
    sidebarAddButton = document.querySelector('.sidebar-add-button');
    unusedCharsDisplay = document.getElementById('unused-chars-display');

    // Clear local storage
    localStorage.clear();

    // Reset settings to defaults
    settings = {
        minWordLength: 1,
        maxWordLength: 15
    };

    // Clear all inputs and grids
    textInput.value = '';
    leftWordGrid.innerHTML = '';
    rightWordGrid.innerHTML = '';
    wordGrid.innerHTML = '';
    
    // Reset word tracking
    requiredWordsMap.clear();
    excludedWords.length = 0;
    
    // Reset settings UI
    function updateSettingsUI() {
        const minSlider = document.getElementById('min-word-length');
        const maxSlider = document.getElementById('max-word-length');
        const minValueDisplay = document.getElementById('min-word-length-value');
        const maxValueDisplay = document.getElementById('max-word-length-value');

        // Set initial values
        minSlider.value = settings.minWordLength;
        maxSlider.value = settings.maxWordLength;
        minValueDisplay.textContent = settings.minWordLength;
        maxValueDisplay.textContent = settings.maxWordLength;

        // Add input event listener for min slider
        minSlider.addEventListener('input', function() {
            const minValue = parseInt(this.value);
            const maxValue = parseInt(maxSlider.value);
            
            // Ensure min doesn't exceed max
            if (minValue > maxValue) {
                this.value = maxValue;
                minValueDisplay.textContent = maxValue;
            } else {
                minValueDisplay.textContent = minValue;
            }
        });

        // Add input event listener for max slider
        maxSlider.addEventListener('input', function() {
            const maxValue = parseInt(this.value);
            const minValue = parseInt(minSlider.value);
            
            // Ensure max doesn't go below min
            if (maxValue < minValue) {
                this.value = minValue;
                maxValueDisplay.textContent = minValue;
            } else {
                maxValueDisplay.textContent = maxValue;
            }
        });
    }

    updateSettingsUI();

    // Load settings from localStorage if available
    const savedSettings = localStorage.getItem('anagramSolverSettings');
    if (savedSettings) {
        settings = { ...settings, ...JSON.parse(savedSettings) };
    }

    function cleanText(text) {
        return text.toLowerCase().replace(/[^a-z]/g, '');
    }

    function showError(message, isSuccess = false) {
        // Remove any existing toasts
        const existingToast = document.querySelector('.error-toast');
        const existingOverlay = document.querySelector('.error-overlay');
        if (existingToast) existingToast.remove();
        if (existingOverlay) existingOverlay.remove();

        // Create toast
        const toast = document.createElement('div');
        toast.className = `error-toast ${isSuccess ? 'success' : 'error'}`;
        toast.style.display = 'flex';
        
        const text = document.createElement('p');
        text.className = 'error-text';
        text.textContent = message;
        
        toast.appendChild(text);
        document.body.appendChild(toast);

        const overlay = document.createElement('div');
        overlay.className = 'error-overlay';
        overlay.style.display = 'flex';
        document.body.appendChild(overlay);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
            overlay.classList.add('show');
        });

        // Clear any existing timeout
        if (window.toastTimeout) {
            clearTimeout(window.toastTimeout);
        }

        // Auto dismiss after duration
        const duration = isSuccess ? 1000 : 3000;
        window.toastTimeout = setTimeout(() => {
            dismissError(toast, overlay);
        }, duration);

        // Click to dismiss
        overlay.addEventListener('click', () => {
            dismissError(toast, overlay);
        });
    }

    function dismissError(toast, overlay) {
        // Restore blur to settings modal if it exists
        const settingsModal = document.querySelector('.settings-modal');
        if (settingsModal) {
            settingsModal.style.backdropFilter = 'blur(3px)';
        }

        toast.classList.add('fade-out');
        overlay.classList.add('fade-out');
        
        setTimeout(() => {
            if (document.body.contains(overlay)) {
                overlay.remove();
            }
            if (document.body.contains(toast)) {
                toast.remove();
            }
        }, 300);
    }

    function usesAllCharacters(sourceText, words) {
        sourceText = cleanText(sourceText);
        
        const sourceChars = {};
        for (const char of sourceText) {
            sourceChars[char] = (sourceChars[char] || 0) + 1;
        }
        
        const wordChars = {};
        for (const word of words) {
            for (const char of cleanText(word)) {
                wordChars[char] = (wordChars[char] || 0) + 1;
            }
        }
        
        // Check if source text has enough of each character needed for the words
        for (const char in wordChars) {
            if (!sourceChars[char] || sourceChars[char] < wordChars[char]) {
                return false;
            }
        }
        
        return true;
    }

    function checkPerfectMatch(cleanInputText, requiredWords) {
        // Check if the required words use exactly all characters from input
        const wordChars = {};
        for (const word of requiredWords) {
            for (const char of word) {
                wordChars[char] = (wordChars[char] || 0) + 1;
            }
        }
        
        const inputChars = {};
        for (const char of cleanInputText) {
            inputChars[char] = (inputChars[char] || 0) + 1;
        }
        
        let isExactMatch = true;
        for (const char in inputChars) {
            if (inputChars[char] !== (wordChars[char] || 0)) {
                isExactMatch = false;
                break;
            }
        }
        for (const char in wordChars) {
            if (wordChars[char] !== (inputChars[char] || 0)) {
                isExactMatch = false;
                break;
            }
        }
        
        return isExactMatch;
    }

    function createLeftSidebarRow(word, onRemove) {
        const row = document.createElement('div');
        row.className = 'word-row';

        const wordDiv = document.createElement('div');
        wordDiv.className = 'word required';
        wordDiv.textContent = word;
        row.appendChild(wordDiv);

        const counter = document.createElement('span');
        counter.className = 'word-counter';
        counter.textContent = '(1x)';
        row.appendChild(counter);

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';

        const duplicateButton = document.createElement('button');
        duplicateButton.className = 'button';
        duplicateButton.textContent = '+';
        duplicateButton.onclick = () => {
            addToLeftSidebar(word);
        };
        buttonContainer.appendChild(duplicateButton);

        const removeButton = document.createElement('button');
        removeButton.className = 'button';
        removeButton.textContent = '-';
        removeButton.onclick = () => {
            const currentCount = requiredWordsMap.get(word);
            if (currentCount > 1) {
                requiredWordsMap.set(word, currentCount - 1);
                counter.textContent = `(${currentCount - 1}x)`;
            } else {
                requiredWordsMap.delete(word);
                onRemove();
            }
            processCurrentInput();
            updateUnusedCharacters();
        };
        buttonContainer.appendChild(removeButton);

        row.appendChild(buttonContainer);
        return row;
    }

    function createRightSidebarRow(word, onRemove) {
        const row = document.createElement('div');
        row.className = 'word-row';

        const wordDiv = document.createElement('div');
        wordDiv.className = 'word-text excluded';
        wordDiv.textContent = word;
        row.appendChild(wordDiv);

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';

        const removeButton = document.createElement('button');
        removeButton.className = 'button';
        removeButton.textContent = '-';
        removeButton.onclick = onRemove;
        buttonContainer.appendChild(removeButton);

        row.appendChild(buttonContainer);
        return row;
    }

    function addToLeftSidebar(word) {
        word = cleanText(word);
        if (!word) {
            return;
        }
        
        const inputText = cleanText(textInput.value.trim());
        if (!inputText) {
            return;
        }
        
        // Create array of current required words including duplicates
        const currentRequiredWords = [];
        requiredWordsMap.forEach((count, word) => {
            for (let i = 0; i < count; i++) {
                currentRequiredWords.push(word);
            }
        });
        
        // Add the word we're trying to add (whether it's new or existing)
        currentRequiredWords.push(word);
        
        // Check if all required words (including the new one) can be made from input
        if (!usesAllCharacters(inputText, currentRequiredWords)) {
            showError('The combination of letters in all the required words cannot be formed from the letters in the main text input.');
            return;
        }
        
        if (requiredWordsMap.has(word)) {
            const currentCount = requiredWordsMap.get(word);
            requiredWordsMap.set(word, currentCount + 1);
            
            const existingRow = Array.from(leftWordGrid.children).find(row => 
                row.querySelector('.word').textContent === word
            );
            if (existingRow) {
                const counter = existingRow.querySelector('.word-counter');
                counter.textContent = `(${currentCount + 1}x)`;
            }
        } else {
            requiredWordsMap.set(word, 1);
            const wordRow = createLeftSidebarRow(word, () => {
                requiredWordsMap.delete(word);
                leftWordGrid.removeChild(wordRow);
                processCurrentInput();
                updateUnusedCharacters();
            });
            leftWordGrid.appendChild(wordRow);
        }
        processCurrentInput();
        updateUnusedCharacters();
    }

    function addToRightSidebar(word) {
        word = cleanText(word);
        if (!word || excludedWords.includes(word)) {
            return;
        }
        
        excludedWords.push(word);
        const wordRow = createRightSidebarRow(word, () => {
            excludedWords = excludedWords.filter(w => w !== word);
            rightWordGrid.removeChild(wordRow);
            processCurrentInput();
            updateUnusedCharacters();
        });
        rightWordGrid.appendChild(wordRow);
        processCurrentInput();
        updateUnusedCharacters();
    }

    function displayResults(results, isPerfectMatch = false) {
        wordGrid.innerHTML = '';
        
        if (!results && !isPerfectMatch) {
            return;
        }

        if (isPerfectMatch) {
            const perfectResult = [];
            requiredWordsMap.forEach((count, word) => {
                for (let i = 0; i < count; i++) {
                    perfectResult.push(word);
                }
            });
            results = [perfectResult];
        }

        if (results && results.length > 0) {
            let validResultsFound = false;
            
            results.forEach(wordList => {
                // Check if all words in the result meet length requirements
                const isValidResult = wordList.every(word => {
                    const length = cleanText(word).length;
                    return length >= settings.minWordLength && length <= settings.maxWordLength;
                });

                if (!isValidResult) {
                    return; // Skip this result if any word doesn't meet length requirements
                }

                validResultsFound = true;
                const row = document.createElement('div');
                row.className = isPerfectMatch ? 'word-row perfect-match' : 'word-row';

                // Track how many times we've seen each required word in this row
                const seenCounts = new Map();
                
                wordList.sort((a, b) => {
                    const aRequired = requiredWordsMap.has(a);
                    const bRequired = requiredWordsMap.has(b);
                    if (aRequired && !bRequired) return -1;
                    if (!aRequired && bRequired) return 1;
                    return a.localeCompare(b);
                }).forEach(word => {
                    const wordContainer = document.createElement('div');
                    wordContainer.className = 'word-container';
                    
                    const wordDiv = document.createElement('div');
                    wordDiv.className = 'word';
                    wordDiv.textContent = word;
                    
                    // Initialize count for this word if not seen yet
                    if (!seenCounts.has(word)) {
                        seenCounts.set(word, 0);
                    }

                    // Only add required class if we haven't exceeded the count
                    if (requiredWordsMap.has(word) && seenCounts.get(word) < requiredWordsMap.get(word)) {
                        wordDiv.classList.add('required');
                        seenCounts.set(word, seenCounts.get(word) + 1);
                    } else if (excludedWords.includes(word)) {
                        wordDiv.classList.add('excluded');
                    }

                    if (!requiredWordsMap.has(word)) {
                        const leftButton = document.createElement('button');
                        leftButton.className = 'button';
                        leftButton.textContent = '+';
                        leftButton.onclick = () => addToLeftSidebar(word);
                        wordContainer.appendChild(leftButton);
                        
                        wordContainer.appendChild(wordDiv);
                        
                        const rightButton = document.createElement('button');
                        rightButton.className = 'button';
                        rightButton.textContent = '-';
                        rightButton.onclick = () => addToRightSidebar(word);
                        wordContainer.appendChild(rightButton);
                    } else {
                        wordContainer.appendChild(wordDiv);
                    }
                    
                    row.appendChild(wordContainer);
                });

                if (isPerfectMatch) {
                    const perfectMatchLabel = document.createElement('div');
                    perfectMatchLabel.className = 'perfect-match-label';
                    perfectMatchLabel.innerHTML = '&#10004; Perfect Match';
                    row.appendChild(perfectMatchLabel);
                }

                wordGrid.appendChild(row);
            });

            // Show no results if all results were filtered out
            if (!validResultsFound) {
                wordGrid.innerHTML = '<div class="no-results">No results found</div>';
            }
        } else if (!isPerfectMatch) {
            wordGrid.innerHTML = '<div class="no-results">No results found</div>';
        }
    }

    function saveSettings() {
        const minValue = parseInt(document.getElementById('min-word-length').value);
        const maxValue = parseInt(document.getElementById('max-word-length').value);

        // Ensure min doesn't exceed max before saving
        settings.minWordLength = Math.min(minValue, maxValue);
        settings.maxWordLength = Math.max(minValue, maxValue);

        localStorage.setItem('anagramSolverSettings', JSON.stringify(settings));
        closeSettings();
        showError('Settings saved successfully!', true);
        
        // Rerun the solver with new settings
        processCurrentInput();
    }

    function showSettings() {
        const modal = document.getElementById('settings-modal');
        modal.style.display = 'flex';
        updateSettingsUI();
        
        // Trigger animation
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }

    function closeSettings() {
        const modal = document.getElementById('settings-modal');
        modal.classList.remove('show');
        
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    async function processCurrentInput() {
        const inputText = textInput.value.trim();
        if (!inputText) {
            displayResults([]);
            return;
        }

        // Show loading overlay
        loadingOverlay.style.display = 'flex';

        // Get array of required words with duplicates
        const requiredWords = [];
        requiredWordsMap.forEach((count, word) => {
            for (let i = 0; i < count; i++) {
                requiredWords.push(cleanText(word));
            }
        });

        const cleanInputText = cleanText(inputText);

        // If we have required words and they form a perfect match, just display them
        if (requiredWords.length > 0 && checkPerfectMatch(cleanInputText, requiredWords)) {
            loadingOverlay.style.display = 'none';
            displayResults(null, true);
            return;
        }

        try {
            const response = await fetch('/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: inputText,
                    excludedWords: excludedWords,
                    requiredWords: requiredWords,
                    minWordLength: settings.minWordLength,
                    maxWordLength: settings.maxWordLength
                })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            displayResults(data.results);
        } catch (error) {
            console.error('Error:', error);
            showError('Failed to get results from server');
        } finally {
            // Hide loading overlay
            loadingOverlay.style.display = 'none';
        }
    }

    function updateUnusedCharacters() {
        const mainText = textInput.value.toLowerCase();
        const requiredWordsArray = Array.from(requiredWordsMap.keys());
        
        // Create a Map to track character frequencies in the main text
        const charFreqMap = new Map();
        for (const char of mainText) {
            if (/[a-z]/.test(char)) {  // Only count letters
                charFreqMap.set(char, (charFreqMap.get(char) || 0) + 1);
            }
        }
        
        // Subtract characters used in required words
        for (const word of requiredWordsArray) {
            for (const char of word.toLowerCase()) {
                if (charFreqMap.has(char)) {
                    const freq = charFreqMap.get(char) - 1;
                    if (freq <= 0) {
                        charFreqMap.delete(char);
                    } else {
                        charFreqMap.set(char, freq);
                    }
                }
            }
        }
        
        // Convert remaining characters to string
        const unusedChars = Array.from(charFreqMap.entries())
            .map(([char, freq]) => char.repeat(freq))
            .join('');
        
        // Update the display
        unusedCharsDisplay.textContent = unusedChars || 'No unused characters';
    }

    // Set up event listeners
    document.querySelector('.start-button').addEventListener('click', processCurrentInput);
    
    textInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            processCurrentInput();
        }
    });

    textInput.addEventListener('input', function() {
        updateUnusedCharacters();
    });

    // Sidebar input handlers
    sidebarAddButton.addEventListener('click', function() {
        const word = sidebarInput.value.trim();
        if (word) {
            addToLeftSidebar(word);
            sidebarInput.value = '';
        }
    });

    sidebarInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const word = sidebarInput.value.trim();
            if (word) {
                addToLeftSidebar(word);
                sidebarInput.value = '';
            }
        }
    });

    document.getElementById('left-reset-button').addEventListener('click', function() {
        requiredWordsMap.clear();
        leftWordGrid.innerHTML = '';
        processCurrentInput();
        updateUnusedCharacters();
    });

    document.getElementById('right-reset-button').addEventListener('click', function() {
        excludedWords = [];
        rightWordGrid.innerHTML = '';
        processCurrentInput();
        updateUnusedCharacters();
    });

    // Settings button event listeners
    document.getElementById('settings-button').addEventListener('click', showSettings);
    document.querySelector('.close-settings-button').addEventListener('click', closeSettings);
    document.querySelector('.save-settings-button').addEventListener('click', saveSettings);

    // Close settings when clicking outside
    document.getElementById('settings-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeSettings();
        }
    });
});
