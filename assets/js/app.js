document.addEventListener('DOMContentLoaded', function() {
        
        // --- Globals ---
        let analysisResults = [];
        let EXAMPLE_SHLOKAS = {}; // Will be populated by fetch

        // --- DOM Elements ---
        const textInput = document.getElementById('textInput');
        const uploadTextButton = document.getElementById('uploadTextButton');
        const loadTextInput = document.getElementById('loadTextInput');
        const analyzeButton = document.getElementById('analyzeButton');
        const clearButton = document.getElementById('clearButton');
        const runTestsButton = document.getElementById('runTestsButton'); // NEW
        const padantaGuruCheckbox = document.getElementById('padantaGuru');
        
        const resultsArea = document.getElementById('results-area');
        const textInputError = document.getElementById('textInputError');

        const summaryMeterName = document.getElementById('summary-meter-name');
        const summaryMeterType = document.getElementById('summary-meter-type'); // NEW
        const summarySyllablePattern = document.getElementById('summary-syllable-pattern');
        const summaryTotalLines = document.getElementById('summary-total-lines');

        const resultsBody = document.getElementById('resultsBody');
        const downloadCsvButton = document.getElementById('downloadCsvButton');
        const downloadJsonButton = document.getElementById('downloadJsonButton');
        const exampleButtons = document.getElementById('example-buttons');

        // --- [v3] Fetch Example Shlokas from JSON ---
        const shlokasUrl = "https://raw.githubusercontent.com/sciencewithsaucee-sudo/ChandasMeter/main/shlokas_v3.json";

        fetch(shlokasUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                EXAMPLE_SHLOKAS = data;
                // Enable buttons once data is loaded
                exampleButtons.querySelectorAll('button').forEach(btn => {
                    btn.disabled = false;
                    btn.style.opacity = 1;
                });
            })
            .catch(error => {
                console.error("Error fetching shlokas.json:", error);
                textInputError.textContent = "Could not load example shlokas. Check console for details.";
                textInputError.style.display = 'block';
                // Disable example buttons
                exampleButtons.querySelectorAll('button').forEach(btn => {
                    btn.disabled = true;
                    btn.style.opacity = 0.5;
                    btn.title = "Failed to load examples";
                });
            });

        // --- Event Listeners ---
        uploadTextButton.addEventListener('click', () => loadTextInput.click());
        loadTextInput.addEventListener('change', loadTextFile);
        analyzeButton.addEventListener('click', processInput);
        clearButton.addEventListener('click', clearAll);
        runTestsButton.addEventListener('click', runUnitTests); // NEW
        downloadCsvButton.addEventListener('click', () => downloadFile('csv'));
        downloadJsonButton.addEventListener('click', () => downloadFile('json'));

        exampleButtons.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const meter = e.target.dataset.meter;
                if (EXAMPLE_SHLOKAS[meter]) {
                    textInput.value = EXAMPLE_SHLOKAS[meter];
                    textInput.focus();
                    textInput.style.transition = 'box-shadow 0.2s';
                    textInput.style.boxShadow = '0 0 0 3px rgba(74, 20, 140, 0.3)';
                    setTimeout(() => {
                        textInput.style.boxShadow = 'var(--shadow-sm)';
                    }, 1000);
                } else {
                    console.warn(`No example shloka found for meter: ${meter}`);
                }
            }
        });

        // --- [v3] Gana Mapping ---
        const GANA_MAP = {
            'L-G-G': 'ya (य)',
            'G-G-G': 'ma (म)',
            'G-G-L': 'ta (त)',
            'G-L-G': 'ra (र)',
            'L-G-L': 'ja (ज)',
            'G-L-L': 'bha (भ)',
            'L-L-L': 'na (न)',
            'L-L-G': 'sa (स)',
        };

        // --- [v3] Formal Meter Grammar Databases ---

        /**
         * [FIX] Creates a flexible regex from a base L-G pattern.
         */
        function createPatternRegex(pattern) {
            const padantaGuru = padantaGuruCheckbox.checked;
            
            if (padantaGuru) {
                // [FIX] Correct regex logic
                // Finds the last hyphen and replaces the character *after* it
                const lastHyphen = pattern.lastIndexOf('-');
                if (lastHyphen === -1) return new RegExp('^(L|G)$'); // Handle single-syllable pattern
                
                const base = pattern.substring(0, lastHyphen + 1); // e.g., "G-G-L-"
                // The last syllable can be L or G
                return new RegExp('^' + base + '(L|G)$');
            } else {
                // If padantaGuru is off, require an exact match
                return new RegExp('^' + pattern + '$');
            }
        }

        // VARNA-VRITA: Syllable-based meters
        // [FIX] Corrected ALL patterns in the database
        const VARNA_METER_DATABASE = {
            // 11 Syllables (Triṣṭubh)
            'Indravajrā': {
                syllables: 11,
                pattern: 'G-G-L-G-G-L-L-G-L-G-G', // ta-ta-ja-ga-ga
                gana: 'ta-ta-ja-ga-ga (त-त-ज-ग-ग)'
            },
            'Upendravajrā': {
                syllables: 11,
                pattern: 'L-G-L-G-G-L-L-G-L-G-G', // ja-ta-ja-ga-ga
                gana: 'ja-ta-ja-ga-ga (ज-त-ज-ग-ग)'
            },
            'Rathoddhatā': {
                syllables: 11,
                pattern: 'G-L-G-L-L-L-G-L-G-L-G', // ra-na-ra-la-ga
                gana: 'ra-na-ra-la-ga (र-न-र-ल-ग)'
            },
            // 12 Syllables (Jagatī)
            'Vaṁśastha': {
                syllables: 12,
                pattern: 'L-G-L-G-G-L-G-L-L-G-L-G', // ja-ta-ja-ra
                gana: 'ja-ta-ja-ra (ज-त-ज-र)'
            },
            'Drutavilambita': {
                syllables: 12,
                pattern: 'L-L-L-G-L-L-G-L-L-G-L-G', // na-bha-bha-ra
                gana: 'na-bha-bha-ra (न-भ-भ-र)'
            },
            // 14 Syllables (Śakvarī)
            'Vasantatilakā': {
                syllables: 14,
                pattern: 'G-G-L-G-L-L-L-G-L-L-G-L-G-G', // ta-bha-ja-ja-ga-ga
                gana: 'ta-bha-ja-ja-ga-ga (त-भ-ज-ज-ग-ग)'
            },
            // 15 Syllables (Atiśakvarī)
            'Mālinī': {
                syllables: 15,
                pattern: 'L-L-L-L-L-L-G-G-G-L-G-G-L-G-G', // na-na-ma-ya-ya
                gana: 'na-na-ma-ya-ya (न-न-म-य-य)'
            },
            // 16 Syllables (Aṣṭi)
             'Puṣpitāgrā': { // This is an Ardha-sama-vṛtta
                syllables: [12, 13], // Odd pādas: 12, Even pādas: 13
                pattern: [
                    'L-L-L-G-L-L-G-L-L-G-L-G', // 12 (na-na-ra-ya)
                    'L-L-L-G-L-L-L-G-L-G-L-G-G' // 13 (na-ja-ja-ra-ga)
                ],
                gana: 'Odd: na-na-ra-ya, Even: na-ja-ja-ra-ga'
            },
            // 17 Syllables (Atyaṣṭi)
            'Śikhariṇī': {
                syllables: 17,
                pattern: 'L-G-G-G-G-G-L-L-L-L-L-G-L-L-G-L-G', // ya-ma-na-sa-bha-la-ga
                gana: 'ya-ma-na-sa-bha-la-ga (य-म-न-स-भ-ल-ग)'
            },
            'Mandākrāntā': {
                syllables: 17,
                pattern: 'G-G-G-G-L-L-L-L-L-G-G-L-G-G-L-G-G', // ma-bha-na-ta-ta-ga-ga
                gana: 'ma-bha-na-ta-ta-ga-ga (म-भ-न-त-त-ग-ग)'
            },
            'Hariṇī': {
                syllables: 17,
                pattern: 'L-L-L-L-L-G-G-G-G-G-L-G-L-G-L-G-G', // na-sa-ma-ra-sa-la-ga
                gana: 'na-sa-ma-ra-sa-la-ga (न-स-म-र-स-ल-ग)'
            },
            // 19 Syllables (Dhṛti)
            'Śārdūlavikrīḍita': {
                syllables: 19,
                pattern: 'G-G-G-L-L-G-L-G-L-L-L-G-G-G-L-G-G-L-G', // ma-sa-ja-sa-ta-ta-ga
                gana: 'ma-sa-ja-sa-ta-ta-ga (म-स-ज-स-त-त-ग)'
            },
            // 21 Syllables (Prakṛti)
            'Sragdharā': {
                syllables: 21,
                pattern: 'G-G-G-G-L-G-G-L-L-L-L-L-L-G-G-L-G-G-L-G-G', // ma-ra-bha-na-ya-ya-ya
                gana: 'ma-ra-bha-na-ya-ya-ya (म-र-भ-न-य-य-य)'
            }
        };

        // MATRA-VRITA: Morae-based meters
        const MATRA_METER_DATABASE = {
            'Āryā': {
                type: 'matra',
                pada_matras: [12, 18, 12, 15],
                check: (lines) => {
                    if (lines.length !== 4) return false;
                    const matras = lines.map(l => l.matraCount);
                    return matras[0] === 12 && matras[1] === 18 && matras[2] === 12 && matras[3] === 15;
                },
                gana: 'Mātrā-based: 12, 18, 12, 15'
            },
            'Gīti': {
                type: 'matra',
                pada_matras: [12, 18, 12, 18],
                check: (lines) => {
                    if (lines.length !== 4) return false;
                    const matras = lines.map(l => l.matraCount);
                    return matras[0] === 12 && matras[1] === 18 && matras[2] === 12 && matras[3] === 18;
                },
                gana: 'Mātrā-based: 12, 18, 12, 18'
            },
            'Upagīti': {
                type: 'matra',
                pada_matras: [12, 15, 12, 15],
                check: (lines) => {
                    if (lines.length !== 4) return false;
                    const matras = lines.map(l => l.matraCount);
                    return matras[0] === 12 && matras[1] === 15 && matras[2] === 12 && matras[3] === 15;
                },
                gana: 'Mātrā-based: 12, 15, 12, 15'
            }
            // ... other matra meters
        };


        // --- Main Functions ---

        function loadTextFile(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                textInput.value = e.target.result;
            };
            reader.readAsText(file);
            event.target.value = null; // Reset file input
        }

        function setProcessingState(isLoading) {
            analyzeButton.disabled = isLoading;
            if (isLoading) {
                analyzeButton.classList.add('btn-loading');
                analyzeButton.querySelector('.btn-text').textContent = 'Analyzing...';
            } else {
                analyzeButton.classList.remove('btn-loading');
                analyzeButton.querySelector('.btn-text').textContent = 'Analyze Chandas';
            }
        }

        function clearAll() {
            textInput.value = '';
            textInputError.style.display = 'none';
            resultsArea.classList.add('hidden');
            resultsBody.innerHTML = '';
            analysisResults = [];
        }

        /**
         * Main function to process the user's input
         */
        function processInput() {
            setProcessingState(true);
            textInputError.style.display = 'none';
            analysisResults = [];

            const rawText = textInput.value.trim();
            if (!rawText) {
                textInputError.textContent = 'Please paste a shloka or upload a .txt file.';
                textInputError.style.display = 'block';
                setProcessingState(false);
                return;
            }
            
            // [v3] Formal Normalization (Spec Point 2)
            const lines = rawText
                .normalize('NFC') // Unicode Normalization
                .replace(/[\u093D\u0053\u0073]/g, '') // Remove Avagraha (ऽ) and S/s
                .split(/[\n\r।॥]+/) // Split by any danda or newline
                .map(line => line.replace(/[0-9०-९.,!?;-]/g, '').trim()) // Clean punctuation/numbers
                .filter(line => line.length > 0);

            if (lines.length === 0) {
                textInputError.textContent = 'No valid Sanskrit text found. Please check your input.';
                textInputError.style.display = 'block';
                setProcessingState(false);
                return;
            }

            setTimeout(() => {
                try {
                    const lineResults = lines.map((line, i) => analyzeLine(line, i));
                    
                    // [v3] Identify meter based on ALL lines (for Upajati, Arya etc)
                    const { slokaMeter, slokaType } = identifySlokaMeter(lineResults);

                    analysisResults = lineResults; // Store all lines
                    
                    renderTable(analysisResults);
                    renderSummary(slokaMeter, slokaType, lineResults);
                    
                    resultsArea.classList.remove('hidden');
                    resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } catch (e) {
                    console.error("Error during analysis:", e);
                    textInputError.textContent = `An error occurred during analysis: ${e.message}`;
                    textInputError.style.display = 'block';
                } finally {
                    setProcessingState(false);
                }
            }, 10);
        }

        /**
         * Analyzes a single line (pada) of Sanskrit text
         */
        function analyzeLine(line, lineIndex) {
            const syllables = syllabify(line);

            // --- [BUG FIX 3] ---
            // We now get weights TWICE.
            
            // 1. Get weights for VARNA meters (uses checkbox)
            const varnaWeights = getWeights(syllables, padantaGuruCheckbox.checked);
            
            // 2. Get weights for MATRA meters (padantaGuru is ALWAYS false)
            const matraWeights = getWeights(syllables, false); // <--- This is new

            // 3. Calculate matraCount from matraWeights (the "correct" count)
            const matraCount = matraWeights.reduce((acc, w) => acc + (w === 'G' ? 2 : 1), 0);

            // 4. Use varnaWeights for Varna-vṛtta analysis (display, ganas, etc.)
            const ganas = getGanas(varnaWeights);
            const pattern = varnaWeights.join('-');
            const visualization = visualize(syllables, varnaWeights);
            const { matches, status } = matchPadaGrammar(pattern, varnaWeights, lineIndex);
            // --- [END BUG FIX 3] ---

            return {
                line: line,
                lineNumber: lineIndex + 1,
                count: syllables.length,
                matraCount: matraCount, // This is now the "pure" matra count
                syllables: syllables,
                weights: varnaWeights, // These are the weights shown in the table
                ganas: ganas, 
                pattern: pattern,
                visualization: visualization,
                identifiedMeters: matches.join(', ') || 'N/A', 
                matchStatus: status 
            };
        }

        // --- [v3] Phonology Pipeline (Syllabify, Weight, Gana) ---

        /**
         * [FIX] Replaced entire broken function
         * Splits a Devanagari string into an array of syllables (Aksharas)
         */
        function syllabify(line) {
            const syllables = [];
            if (!line) return syllables;

            // Regex checks (vocalics included)
            const isConsonant = (char) => /[\u0915-\u0939]/.test(char);
            const isVowel = (char) => /[\u0905-\u0914\u0960\u0961\u090C\u0962]/.test(char); // Includes ऋॠऌॡ
            const isMatra = (char) => /[\u093E-\u094C\u0943\u0944\u0962\u0963]/.test(char); // Includes ृॄॢॣ
            const isVirama = (char) => char === '\u094D';
            const isGuruMaker = (char) => /[\u0902\u0903]/.test(char); // Anusvara/Visarga

            let i = 0;
            while (i < line.length) {
                let char = line[i];
                
                if (char === ' ' || char === '\t') { i++; continue; }

                let currentSyllable = "";

                if (isVowel(char)) { // Start with an independent vowel
                    currentSyllable = char;
                    i++;
                } else if (isConsonant(char)) { // Start with a consonant
                    currentSyllable = char; // C
                    i++;
                    
                    // Inner loop to consume the rest of the Akshara
                    while (i < line.length) {
                        let nextChar = line[i];

                        if (isVirama(nextChar)) {
                            let nextNextChar = (i + 1 < line.length) ? line[i+1] : '';
                            
                            if (isConsonant(nextNextChar)) {
                                // This is a conjunct, e.g., C + Vira + C
                                currentSyllable += nextChar + nextNextChar;
                                i += 2;
                                // Continue inner loop for C+V+C+V+C...
                            } else {
                                // This is a final virama, e.g., C + Vira (like in राजन्)
                                currentSyllable += nextChar;
                                i++;
                                break; // Syllable is complete
                            }
                        } else if (isMatra(nextChar)) {
                            // This is the vowel part, e.g., C + Matra
                            currentSyllable += nextChar;
                            i++;

                            // [FIX] Check for C+Matra + C + Vira case, e.g., "स्या" + "त्" + "्"
                            let postMatraChar = (i < line.length) ? line[i] : '';
                            let postMatraNext = (i + 1 < line.length) ? line[i+1] : '';

                            if (isConsonant(postMatraChar) && isVirama(postMatraNext)) {
                                let postMatraNextNext = (i + 2 < line.length) ? line[i+2] : '';
                                if (!isConsonant(postMatraNextNext)) {
                                    // This is a C+Vira ending, append it to the current syllable
                                    currentSyllable += postMatraChar + postMatraNext;
                                    i += 2;
                                }
                            }
                            
                            break; // Syllable is complete
                        } else {
                            // Inherent 'a' is implied.
                            
                            // Check for C+Vira+C (next syllable is a conjunct starting)
                            let nextNextChar = (i + 1 < line.length) ? line[i+1] : '';
                            // let nextNextNextChar = (i + 2 < line.length) ? line[i+2] : ''; // Not needed here
                            if (isVirama(nextChar) && isConsonant(nextNextChar)) {
                                // This is a C+Vira+C conjunct starting.
                                // The current syllable ends with 'a'.
                                break; // Break inner loop, the current syllable is complete.
                            }
                            
                            // [BUGGY FIX REMOVED] The C+C+Vira case was causing
                            // "श्व" + "म्" to merge. It is now gone.
                            
                            // Inherent 'a' is implied, and this is the start of the next syllable.
                            break;
                        }
                    } // END OF INNER LOOP

                } else { // This else is now correctly placed
                    // Skip other marks
                    i++;
                    continue;
                }
                
                // Consume trailing GuruMakers (Anusvara/Visarga)
                while (i < line.length && isGuruMaker(line[i])) {
                    currentSyllable += line[i];
                    i++;
                }
                
                if (currentSyllable.length > 0) {
                    syllables.push(currentSyllable);
                }
            }
            return syllables;
        }


        /**
         * Robust Laghu/Guru Weighting
         */
        // --- [BUG FIX 3] ---
        // Added 'usePadantaGuru' argument
        function getWeights(syllables, usePadantaGuru) {
            const weights = [];
            // const padantaGuru = padantaGuruCheckbox.checked; // This is now passed as an argument

            // Helper to check for short vowels (vocalics included)
            const hasShortVowel = (syl) => {
                // Long/diphthong independent vowels
                if (/[\u0906\u0908\u090A\u0960\u0961\u090E\u090F\u0910\u0913\u0914]/.test(syl)) return false;
                // Long/diphthong matras
                if (/[\u093E\u0940\u0942\u0944\u0963\u0947\u0948\u094B\u094C]/.test(syl)) return false;
                // Guru-making endings
                if (/[\u0902\u0903\u094D]$/.test(syl)) return false;
                // Passed all checks, it's short (क, कि, कु, कृ, कॢ, अ, इ, उ, ऋ, ऌ)
                return true;
            };
            
            // --- [BUG FIX 2] ---
            // Helper to check if a syllable *starts* with a conjunct
            const startsWithConjunct = (syl) => {
                // A syllable starts with a conjunct if a virama (्) exists,
                // and it is NOT the *last* character.
                // e.g. "श्व" (ś+्+va) is true. "जन्" (j+a+n+्) is false.
                const viramaIndex = syl.indexOf('\u094D');
                // Check if virama exists (> -1) and is not the last char
                return (viramaIndex > -1 && viramaIndex < syl.length - 1);
            };
            // --- [END BUG FIX 2] ---


            for (let i = 0; i < syllables.length; i++) {
                const syllable = syllables[i];
                let isGuru = false;

                // Rule 1: Contains a long vowel or diphthong
                if (/[ \u0906\u0908\u090A\u0960\u0961\u090E\u090F\u0910\u0913\u0914\u093E\u0940\u0942\u0944\u0963\u0947\u0948\u094B\u094C]/.test(syllable)) {
                    isGuru = true;
                }
                
                // Rule 2: Ends in Anusvara, Visarga, or Virama
                if (/[\u0902\u0903\u094D]$/.test(syllable)) {
                    isGuru = true;
                }

                // Rule 3: Short vowel followed by conjunct (Samyoge Guru)
                if (!isGuru && hasShortVowel(syllable)) {
                    const nextSyllable = syllables[i + 1];
                    if (nextSyllable && startsWithConjunct(nextSyllable)) {
                         isGuru = true;
                    }
                }
                
                // Rule 4: Pādānta (last syllable of the line)
                // --- [BUG FIX 3] ---
                // Now uses the 'usePadantaGuru' argument
                if (usePadantaGuru && i === syllables.length - 1) {
                    isGuru = true;
                }

                weights.push(isGuru ? 'G' : 'L');
            }
            return weights;
        }

        /**
         * Creates an array of Ganas from weights
         */
        function getGanas(weights) {
            const ganas = [];
            for (let i = 0; i < weights.length; i += 3) {
                if (i + 2 < weights.length) {
                    const ganaPattern = weights.slice(i, i + 3).join('-');
                    ganas.push(GANA_MAP[ganaPattern] || '?');
                } else {
                    // Handle remaining syllables (la/ga)
                    const remaining = weights.slice(i);
                    remaining.forEach(w => ganas.push(w === 'G' ? 'ga (ग)' : 'la (ल)'));
                }
            }
            return ganas;
        }

        /**
         * Creates the (G) (L) visualization
         */
        function visualize(syllables, weights) {
            let html = '';
            for (let i = 0; i < syllables.length; i++) {
                const syl = syllables[i];
                const weight = weights[i];
                const className = weight === 'G' ? 'syl-g' : 'syl-l';
                html += `<span class="${className}">${syl}<span class="weight">(${weight})</span></span> `;
            }
            return html;
        }

        // --- [v3] Formal Meter Identification Engine ---

        /**
         * Matches a single pada's L/G pattern against the Varna-vrtta DB.
         */
        function matchPadaGrammar(pattern, weights, lineIndex) {
            let matches = [];
            let status = 'Unknown';
            const count = weights.length;
            
            // 1. Check Anuṣṭubh algorithmically
            if (checkAnushtubhPada(weights)) {
                matches.push('Anuṣṭubh');
                status = 'Variant (Anuṣṭubh)';
            }
            // [FIX] Check for 16-syllable Anuṣṭubh half-verse
            else if (count === 16) {
                const pada1 = weights.slice(0, 8);
                const pada2 = weights.slice(8, 16);
                if (checkAnushtubhPada(pada1, 0) && checkAnushtubhPada(pada2, 1)) { // Pass index
                    matches.push('Anuṣṭubh (Half-Verse)');
                    status = 'Variant (Anuṣṭubh)';
                }
            }
            
            // 2. Check all formal Varna-vrtta regexes
            for (const meterName in VARNA_METER_DATABASE) {
                const meter = VARNA_METER_DATABASE[meterName];
                
                // Handle Ardha-sama-vṛtta like Puṣpitāgrā
                if (Array.isArray(meter.syllables)) {
                    const lineType = (lineIndex % 2); // 0 for odd (1st, 3rd), 1 for even (2nd, 4th)
                    if (count === meter.syllables[lineType]) {
                        const re = createPatternRegex(meter.pattern[lineType]);
                        if (re.test(pattern)) {
                            matches.push(meterName);
                        }
                    }
                }
                // Handle Sama-vṛtta (regular meters)
                else if (count === meter.syllables) {
                    const re = createPatternRegex(meter.pattern);
                    if (re.test(pattern)) {
                        matches.push(meterName);
                    } else if (meterName === 'Śārdūlavikrīḍita' || meterName === 'Mālinī' || meterName === 'Vasantatilakā' || meterName === 'Mandākrāntā' || meterName === 'Sragdharā') {
                         // [DEBUG] Log failures for meters we are testing
                        console.log(`Failed match for ${meterName}:
  Analyzed Pattern: ${pattern} (Length: ${count})
  Expected Pattern: ${meter.pattern} (Length: ${meter.syllables})
  Regex Used: ${re}`);
                    }
                }
            }

            // 3. Determine final status based on matches
            if (matches.length > 0) {
                // If we have regex matches, they are 'Exact'
                if (status !== 'Variant (Anuṣṭubh)' && !matches.includes('Anuṣṭubh (Half-Verse)')) {
                    status = matches.length > 1 ? 'Ambiguous' : 'Exact';
                }
            }
            
            return { matches, status };
        }
        
        /**
         * Special algorithmic check for Anuṣṭubh pādas
         */
        // --- [BUG FIX 3] ---
        // Added lineIndex to support stricter 7th syllable rule if you add it later
        // Not strictly needed for this bug, but good practice.
        function checkAnushtubhPada(weights, lineIndex) {
            if (weights.length !== 8) return false;
            
            const fifth = weights[4];
            const sixth = weights[5];
            
            // Primary rule: 5th must be Laghu, 6th must be Guru
            return (fifth === 'L' && sixth === 'G');
            // TODO: Add 7th syllable rule using lineIndex
        }

        /**
         * Identifies the single best meter for the *entire śloka*.
         */
        function identifySlokaMeter(lines) {
            if (lines.length === 0) return { slokaMeter: 'N/A', slokaType: 'N/A' };
            
            // --- Check 1: Uniform Varna-vṛtta (e.g., all 4 lines are Vasantatilakā) ---
            const firstLineMatches = lines[0].identifiedMeters.split(', ').filter(m => m && m !== 'N/A');
            if (firstLineMatches.length > 0) {
                for (const meterName of firstLineMatches) {
                    if (meterName.includes('Anuṣṭubh')) continue; // Handle Anuṣṭubh separately
                    
                    const isUniform = lines.every(l => l.identifiedMeters.includes(meterName));
                    if (isUniform) {
                        lines.forEach(l => l.matchStatus = 'Exact'); // Set all lines to Exact
                        return { slokaMeter: meterName, slokaType: 'Varṇa-vṛtta' };
                    }
                }
            }

            // --- Check 2: Upajāti (Mixed Indravajrā/Upendravajrā) ---
            const isUpajati = lines.every(l => 
                l.count === 11 && (l.identifiedMeters.includes('Indravajrā') || l.identifiedMeters.includes('Upendravajrā'))
            );
            if (isUpajati) {
                lines.forEach(l => l.matchStatus = 'Variant (Upajāti)');
                return { slokaMeter: 'Upajāti (Mixed)', slokaType: 'Varṇa-vṛtta' };
            }
            
            // --- Check 3: Anuṣṭubh ---
            // --- [BUG FIX 3] ---
            // The check now uses the "pure" matraCount, so it will work.
            const isAnushtubh = lines.every(l => l.matchStatus.includes('Anuṣṭubh'));
            if (isAnushtubh) {
                return { slokaMeter: 'Anuṣṭubh', slokaType: 'Varṇa-vṛtta' };
            }
            
            // --- Check 4: Mātrā-vṛtta (e.g., Āryā) ---
            if (lines.length === 4) {
                for (const meterName in MATRA_METER_DATABASE) {
                    const meter = MATRA_METER_DATABASE[meterName];
                    if (meter.check(lines)) {
                        lines.forEach(l => l.matchStatus = 'Exact (Mātrā)');
                        return { slokaMeter: meterName, slokaType: 'Mātrā-vṛtta' };
                    }
                }
            }
            
            // --- Fallback: Unknown or Irregular ---
            return { slokaMeter: 'Unknown / Irregular', slokaType: 'N/A' };
        }


        // --- [v3] Rendering and Export ---

        /**
         * Renders the main summary card
         */
        function renderSummary(slokaMeter, slokaType, lines) {
            summaryMeterName.textContent = slokaMeter;
            summaryMeterType.textContent = slokaType;
            summarySyllablePattern.textContent = lines.map(l => l.count).join(' - ');
            summaryTotalLines.textContent = lines.length;
        }

        /**
         * Renders the results into the HTML table
         */
        function renderTable(results) {
            resultsBody.innerHTML = ''; // Clear previous results
            results.forEach((lineResult) => {
                const row = resultsBody.insertRow();
                
                let statusClass = 'status-unknown';
                if (lineResult.matchStatus.startsWith('Exact')) statusClass = 'status-exact';
                else if (lineResult.matchStatus.startsWith('Variant')) statusClass = 'status-variant';
                else if (lineResult.matchStatus === 'Ambiguous') statusClass = 'status-ambiguous';

                row.insertCell().textContent = lineResult.lineNumber;
                row.insertCell().textContent = lineResult.count;
                row.insertCell().textContent = lineResult.matraCount;
                row.insertCell().textContent = lineResult.ganas;
                row.insertCell().innerHTML = `<div class="meter-pattern">${lineResult.visualization}</div>`;
                row.insertCell().textContent = lineResult.pattern;
                row.insertCell().textContent = lineResult.identifiedMeters;
                row.insertCell().innerHTML = `<span class="status-tag ${statusClass}">${lineResult.matchStatus}</span>`;
                row.insertCell().textContent = lineResult.line;
            });
        }

        /**
         * Downloads the analysis results as CSV or JSON
         */
        function downloadFile(format) {
            if (analysisResults.length === 0) return;
            
            let data = "";
            let filename = "";
            let mimeType = "";

            const exportData = analysisResults.map((r, i) => ({
                line_number: r.lineNumber,
                syllable_count: r.count,
                matra_count: r.matraCount,
                gana_pattern: r.ganas,
                meter_pattern: r.pattern,
                identified_meters: r.identifiedMeters,
                match_status: r.matchStatus,
                line_text: r.line,
                syllables: r.syllables.join(' | ')
            }));

            if (format === 'json') {
                data = JSON.stringify({
                    summary: {
                        slokaMeter: summaryMeterName.textContent,
                        slokaType: summaryMeterType.textContent,
                        syllablePattern: summarySyllablePattern.textContent,
                        totalLines: summaryTotalLines.textContent
                    },
                    padas: exportData
                }, null, 2);
                filename = "chandas_analysis_v3.json";
                mimeType = "application/json;charset=utf-8;";
            } else { // csv
                const headers = "line_number,syllable_count,matra_count,gana_pattern,meter_pattern,identified_meters,match_status,line_text,syllables\n";
                const escapeCSV = (str) => `"${String(str).replace(/"/g, '""')}"`;
                const csvRows = exportData.map(r => {
                    return [
                        r.line_number,
                        r.syllable_count,
                        r.matra_count,
                        escapeCSV(r.gana_pattern),
                        escapeCSV(r.meter_pattern),
                        escapeCSV(r.identified_meters),
                        escapeCSV(r.match_status),
                        escapeCSV(r.line_text),
                        escapeCSV(r.syllables)
                    ].join(',');
                });
                data = headers + csvRows.join('\n');
                filename = "chandas_analysis_v3.csv";
                mimeType = "text/csv;charset=utf-8;";
            }
            
            const bom = "\uFEFF"; // Byte Order Mark for Excel
            const blob = new Blob([bom + data], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('href', url);
            a.setAttribute('download', filename);
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        // --- [v3] Research-Grade Unit Test Suite ---
        
        function runUnitTests() {
            console.clear();
            console.log("%cRunning ChandasMeter v3 Phonology Unit Tests...", "color: #4A148C; font-size: 1.2rem; font-weight: bold;");
            
            let passed = 0;
            let failed = 0;
            const originalPadanta = padantaGuruCheckbox.checked;
            padantaGuruCheckbox.checked = true; // Force padanta-guru for tests

            function test(name, text, expectedSyllables, expectedWeights) {
                const syllables = syllabify(text);
                // --- [BUG FIX 3] ---
                // Tests should always run with padantaGuru = true
                const weights = getWeights(syllables, true); 
                
                const sylMatch = JSON.stringify(syllables) === JSON.stringify(expectedSyllables);
                const weightMatch = JSON.stringify(weights) === JSON.stringify(expectedWeights);

                if (sylMatch && weightMatch) {
                    console.log(`%c  ✓ PASS: ${name}`, "color: #047857;");
                    passed++;
                } else {
                    console.error(`%c  ✗ FAIL: ${name}`, "color: #B91C1C; font-weight: bold;");
                    if (!sylMatch) {
                        console.error(`     - Syllables: Expected ${JSON.stringify(expectedSyllables)}, Got ${JSON.stringify(syllables)}`);
                    }
                    if (!weightMatch) {
                        console.error(`     - Weights: Expected ${JSON.stringify(expectedWeights)}, Got ${JSON.stringify(weights)}`);
                    }
                    failed++;
                }
            }
            
            console.log("%c--- 1. Syllabification & Samyoge-Guru ---", "font-weight: bold; margin-top: 10px;");
            // 'dharmakṣetre' (G-L-G-G)
            test("Gita 1.1 (धर्मक्षेत्रे)", "धर्मक्षेत्रे", ["ध", "र्म", "क्षे", "त्रे"], ["G", "L", "G", "G"]);
            // 'kurukṣetre' (L-L-G-G)
            test("Gita 1.1 (कुरुक्षेत्रे)", "कुरुक्षेत्रे", ["कु", "रु", "क्षे", "त्रे"], ["L", "L", "G", "G"]);
            // 'samavetā' (L-L-G-G)
            test("Gita 1.1 (समवेता)", "समवेता", ["स", "म", "वे", "ता"], ["L", "L", "G", "G"]);
            // 'yuyutsavaḥ' (L-L-G-G) (padanta makes last G)
            test("Gita 1.1 (युयुत्सवः)", "युयुत्सवः", ["यु", "यु", "त्स", "वः"], ["L", "L", "G", "G"]);
            
            console.log("%c--- 2. Final Virama ---", "font-weight: bold; margin-top: 10px;");
            // 'rājan' (G-G)
            test("Final Virama (राजन्)", "राजन्", ["रा", "जन्"], ["G", "G"]);
            // 'paśyan' (L-G)
            test("Final Virama (पश्यन्)", "पश्यन्", ["प", "श्यन्"], ["L", "G"]);

            console.log("%c--- 3. Anusvara/Visarga ---", "font-weight: bold; margin-top: 10px;");
            // 'kṛṣṇaṁ' (G-G)
            test("Anusvara (कृष्णं)", "कृष्णं", ["कृ", "ष्णं"], ["G", "G"]);
            // 'rāmaḥ' (G-G) (padanta)
            test("Visarga (रामः)", "रामः", ["रा", "मः"], ["G", "G"]);
            
            console.log("%c--- 4. Vocalics (ऋ/ऌ) ---", "font-weight: bold; margin-top: 10px;");
            // 'kṛṣṇa' (G-G) (padanta)
            test("Vocalic Short (कृष्ण)", "कृष्ण", ["कृ", "ष्ण"], ["G", "G"]);
            // 'pitṝṇām' (L-G-G)
            test("Vocalic Long (पितॄणाम्)", "पितॄणाम्", ["पि", "तॄ", "णाम्"], ["L", "G", "G"]);
            // 'kḷptam' (G-G)
            test("Vocalic Short L (कॢप्तम्)", "कॢप्तम्", ["कॢ", "प्तम्"], ["G", "G"]);

            console.log("%c--- 5. Complex Conjuncts ---", "font-weight: bold; margin-top: 10px;");
            // 'tatsma' (G-G) (padanta)
            test("Conjunct (तत्स्म)", "तत्स्म", ["त", "त्स्म"], ["G", "G"]);
            // 'hikṛ' (L-G) (padanta)
            test("Conjunct (हिकृ)", "हिकृ", ["हि", "कृ"], ["L", "G"]);
            // 'uṣṭra' (G-G) (padanta)
            test("Conjunct (उष्ट्र)", "उष्ट्र", ["उ", "ष्ट्र"], ["G","G"]);
            
            console.log("%c--- 6. [NEW] Sragdharā Bug Test ---", "font-weight: bold; margin-top: 10px;");
            // ...vyāpya viśvaṁ (with anusvara)
            test("Sragdharā Bug (व्याप्य विश्वं)", "व्याप्य विश्वं", ["व्या", "प्य", "वि", "श्वं"], ["G", "L", "G", "G"]);
            // ...vyāpya viśvam (with final 'm')
            test("Sragdharā Bug (व्याप्य विश्वम्)", "व्याप्य विश्वम्", ["व्या", "प्य", "वि", "श्व", "म्"], ["G", "L", "G", "L", "G"]);


            console.log("---");
            if (failed > 0) {
                console.error(`%cTest Suite Finished: ${passed} passed, ${failed} failed.`, "color: #B91C1C; font-weight: bold; font-size: 1.1rem;");
            } else {
                console.log(`%cTest Suite Finished: All ${passed} tests passed.`, "color: #047857; font-weight: bold; font-size: 1.1rem;");
            }
            
            // Restore original setting
            padantaGuruCheckbox.checked = originalPadanta;
        }
        
    }); // <-- END OF DOMCONTENTLOADED
