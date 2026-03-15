// --- Global Variables ---
let fullDatabase = {};
let cardDatabase = {};

let charts = {
    topCards: null,
    deckPresence: null,
    timeline: null,
    pairs: null,        // NEW
    buzzwords: null     // NEW
};

document.addEventListener('DOMContentLoaded', () => {
    // --- Random Funny Adjectives ---
    const adjectives = [
        "glorious",
        "delicious",
        "unhinged",
        "questionable",
        "spicy",
        "illegal",
        "sweaty",
        "bricked",
        "starchy", // A little Starch Lord nod
        "absolutely stacked",
        "big brain",
        "toxic",
        "beautiful",
        "chaotic",
        "cursed",
        "devious",
        "high-rolling",
        "diabolical",
        "scrumptious",
        "Weenie Beanie approved",
        "legendary",
        "mildly infuriating",
        "tryhard",
        "S-tier",
        "Ra Zombie approved"
    ];

    // Pick a random adjective and inject it
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const adjElement = document.getElementById('randomAdjective');
    if (adjElement) {
        adjElement.textContent = randomAdj;
    }
    // --- DOM Elements ---
    const deckGrid = document.getElementById('deckGrid');
    const loadingEl = document.getElementById('loading');
    const deckCountEl = document.getElementById('deckCount');
    const searchInput = document.getElementById('searchInput');

    // Modal Elements
    const infoModal = document.getElementById('infoModal');
    const infoBtn = document.getElementById('infoBtn');
    const closeModal = document.getElementById('closeModal');

    // View/Tab Elements
    const deckView = document.getElementById('deckView');
    const statsView = document.getElementById('statsView');
    const searchWrapper = document.getElementById('searchWrapper');
    const statsBtn = document.getElementById('statsBtn');
    const backBtn = document.getElementById('backBtn');

    // --- Fetch Database ---
    fetch('deck_database_final.json')
        .then(response => {
            if (!response.ok) throw new Error("Could not load the database file.");
            return response.json();
        })
        .then(data => {
            fullDatabase = data; // Save to our global variable
            loadingEl.style.display = 'none';

            const totalDecks = Object.keys(data).length;
            deckCountEl.textContent = totalDecks;

            renderDecks(fullDatabase);
        })
        .catch(error => {
            loadingEl.textContent = `Error loading data: ${error.message}`;
            console.error("Fetch error:", error);
        });
    fetch('card_data.json')
        .then(response => {
            if (!response.ok) throw new Error("Could not load the card data file.");
            return response.json();
        })
        .then(data => {
            cardDatabase = data; // Save to our global variable
        })
        .catch(error => {
            console.error("Fetch error:", error);
        });

    // --- Helper Functions ---
    function getYouTubeId(url) {
        if (!url) return null;
        const match = url.match(/[?&]v=([^&]+)/);
        return match ? match[1] : null;
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // --- Render Decks Function ---
    function renderDecks(data) {
        deckGrid.innerHTML = '';

        for (const [deckKey, deckInfo] of Object.entries(data)) {
            const cardEl = document.createElement('div');
            cardEl.className = 'deck-card';

            let cardsHtml = '<ul class="card-list">';
            deckInfo.cards.forEach(card => {
                const cleanCardName = card.replace(/_/g, ' ');
                cardsHtml += `<li>${cleanCardName}</li>`;
            });
            cardsHtml += '</ul>';

            const dateStr = deckInfo.upload_date && deckInfo.upload_date !== "UNKNOWN_DATE"
                ? deckInfo.upload_date
                : "Unknown Date";

            const videoId = getYouTubeId(deckInfo.youtube_url);
            const thumbnailUrl = videoId
                ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                : '';

            cardEl.innerHTML = `
                <div class="deck-header">
                    <h3 class="deck-title">${deckInfo.name}</h3>
                    <span class="deck-date">${dateStr}</span>
                </div>
                
                <details class="video-dropdown">
                    <summary>View Video</summary>
                    <div class="video-preview">
                        <a href="${deckInfo.youtube_url}" target="_blank" title="${deckInfo.youtube_title}">
                            <img src="${thumbnailUrl}" alt="Video Thumbnail" loading="lazy">
                            <div class="video-title-overlay">${deckInfo.youtube_title}</div>
                        </a>
                    </div>
                </details>

                ${cardsHtml}
            `;
            deckGrid.appendChild(cardEl);
        }
    }

    // --- Smart Live Search ---
    searchInput.addEventListener('input', (e) => {
        const rawSearchTerm = e.target.value.trim();

        if (!rawSearchTerm) {
            renderDecks(fullDatabase);
            return;
        }

        const searchRegex = new RegExp('\\b' + escapeRegExp(rawSearchTerm), 'i');
        const filteredData = {};

        for (const [deckKey, deckInfo] of Object.entries(fullDatabase)) {
            const deckName = deckInfo.name || "";
            const ytTitle = deckInfo.youtube_title || "";

            const hasMatchingCard = deckInfo.cards.some(card => {
                const cleanName = card.replace(/_/g, ' ');
                return searchRegex.test(cleanName);
            });

            if (searchRegex.test(deckName) || searchRegex.test(ytTitle) || hasMatchingCard) {
                filteredData[deckKey] = deckInfo;
            }
        }
        renderDecks(filteredData);
    });

    // --- Modal Logic ---
    infoBtn.addEventListener('click', () => infoModal.style.display = 'block');
    closeModal.addEventListener('click', () => infoModal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target === infoModal) infoModal.style.display = 'none';
    });

    // --- Tab Switching Logic (Decks <-> Stats) ---
    // --- Tab Switching Logic (Decks <-> Stats) ---
    statsBtn.addEventListener('click', () => {
        deckView.classList.add('hidden');
        searchWrapper.classList.add('hidden');
        statsBtn.classList.add('hidden');

        statsView.classList.remove('hidden');
        backBtn.classList.remove('hidden');

        // NEW: Read the dropdown value when opening stats
        const currentLimit = document.getElementById('deckLimitFilter') ? document.getElementById('deckLimitFilter').value : 'all';
        renderStatsChart(currentLimit);
    });

    // NEW: Listen for when the user changes the dropdown
    const filterDropdown = document.getElementById('deckLimitFilter');
    if (filterDropdown) {
        filterDropdown.addEventListener('change', (e) => {
            renderStatsChart(e.target.value);
        });
    }

    backBtn.addEventListener('click', () => {
        statsView.classList.add('hidden');
        backBtn.classList.add('hidden');

        deckView.classList.remove('hidden');
        searchWrapper.classList.remove('hidden');
        statsBtn.classList.remove('hidden');
    });

    // --- Stats Rendering Logic ---
    function renderStatsChart(limit = 'all') {
        // --- NEW: Hero Deduction Matrix ---
        const heroCounts = {};
        const heroMatrix = {
            // Plants (Alphabetical order of classes)
            "Mega-Grow,Smarty": "Green Shadow",
            "Kabloom,Solar": "Solar Flare",
            "Guardian,Solar": "Wall-Knight",
            "Mega-Grow,Solar": "Chompzilla",
            "Guardian,Kabloom": "Spudow",
            "Guardian,Smarty": "Citron / Beta-Carrotina",
            "Guardian,Mega-Grow": "Grass Knuckles",
            "Kabloom,Smarty": "Nightcap",
            "Smarty,Solar": "Rose",
            "Kabloom,Mega-Grow": "Captain Combustible",

            // Zombies (Alphabetical order of classes)
            "Beastly,Hearty": "The Smash",
            "Crazy,Sneaky": "Impfinity",
            "Brainy,Hearty": "Rustbolt",
            "Beastly,Crazy": "Electric Boogaloo",
            "Beastly,Sneaky": "Brain Freeze",
            "Brainy,Crazy": "Professor Brainstorm",
            "Beastly,Brainy": "Immorticia",
            "Crazy,Hearty": "Z-Mech",
            "Hearty,Sneaky": "Neptuna",
            "Brainy,Sneaky": "Super Brainz / HG"
        };
        // Existing Data Accumulators
        const cardCopies = {};
        const deckPresence = {};
        const uploadsByYear = {};
        const pairCounts = {};
        const wordCounts = {};
        const stopWords = ["the", "in", "a", "of", "and", "to", "is", "for", "with", "this", "on", "most", "ever", "one", "when", "vs", "are", "that", "my", "i", "but", "it", "at", "an"];

        // NEW Data Accumulators for card_data
        const costCurve = {};
        const classCounts = {};
        const rarityCounts = {};
        const typeCounts = {};
        const statsByCost = {};
        const cardPresenceByYear = {};

        // --- NEW: Pay-to-Win Tracking Variables ---
        let maxSparkCost = -1;
        let minSparkCost = Infinity;
        let mostExpensiveDeck = null;
        let leastExpensiveDeck = null;
        let maxAvgCost = -1;
        let minAvgCost = Infinity;
        let heaviestDeck = null;
        let lightestDeck = null;
        let numDecks = Object.keys(fullDatabase).length;
        let totalUniqueCardSlots = 0;

        // --- NEW: Trending Data Variables ---
        const RECENT_DECK_COUNT = 50;
        const recentCardFreq = {};

        // --- FIX: Safely sort allDecks from newest to oldest ---
        let allDecks = Object.values(fullDatabase).sort((a, b) => {
            const dateA = a.upload_date && a.upload_date !== "UNKNOWN_DATE" ? new Date(a.upload_date).getTime() : 0;
            const dateB = b.upload_date && b.upload_date !== "UNKNOWN_DATE" ? new Date(b.upload_date).getTime() : 0;
            return dateB - dateA;
        });

        // --- Apply the timeframe filter! ---
        if (limit !== 'all') {
            // Split the value (e.g., "latest_500") into direction ("latest") and amount ("500")
            const [direction, amountStr] = limit.split('_');
            const sliceAmount = parseInt(amountStr, 10);

            if (direction === 'latest') {
                // Since newest are at the front (index 0), grab from 0 up to the sliceAmount
                allDecks = allDecks.slice(0, sliceAmount);
            } else if (direction === 'oldest') {
                // Grab the last 'sliceAmount' of elements from the end of the array
                allDecks = allDecks.slice(-sliceAmount);
            }
        }

        const totalDecks = allDecks.length;

        // Process the database
        allDecks.forEach((deck, index) => {
            let uniqueInThisDeck = 0;
            const deckCardNames = [];
            let currentDeckSparkCost = 0;
            let currentDeckTotalMana = 0;
            const currentDeckClasses = new Set();

            // 1. Process Timeline
            let deckYear = null;
            if (deck.upload_date && deck.upload_date !== "UNKNOWN_DATE") {
                const yearMatch = deck.upload_date.match(/\b(20\d{2})\b/);
                if (yearMatch) {
                    deckYear = yearMatch[1];
                    const year = yearMatch[1];
                    uploadsByYear[year] = (uploadsByYear[year] || 0) + 1;
                }
            }

            // 2. Process Title Buzzwords
            if (deck.youtube_title) {
                const words = deck.youtube_title.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
                words.forEach(w => {
                    if (w.length > 2 && !stopWords.includes(w)) {
                        wordCounts[w] = (wordCounts[w] || 0) + 1;
                    }
                });
            }

            // 3. Process Cards & Metadata
            deck.cards.forEach(card => {
                const match = card.match(/^x(\d+)\s+(.+)$/);
                if (match) {
                    const count = parseInt(match[1]);
                    const rawName = match[2];
                    const name = rawName.replace(/_/g, ' ');

                    // Basic Stats
                    cardCopies[name] = (cardCopies[name] || 0) + count;
                    deckPresence[name] = (deckPresence[name] || 0) + 1;
                    deckCardNames.push(name);
                    uniqueInThisDeck++;

                    // If this deck is one of the 50 newest, tally it for the recent pool
                    if (index < RECENT_DECK_COUNT) {
                        recentCardFreq[name] = (recentCardFreq[name] || 0) + count;
                    }
                    if (deckYear) {
                        if (!cardPresenceByYear[name]) cardPresenceByYear[name] = {};
                        cardPresenceByYear[name][deckYear] = (cardPresenceByYear[name][deckYear] || 0) + 1;
                    }
                    // Process Extended Card Data
                    if (typeof cardDatabase !== 'undefined' && cardDatabase[rawName]) {
                        const info = cardDatabase[rawName];

                        // Calculate Sparks
                        if (info.Rarity) {
                            const rarity = info.Rarity.toLowerCase();
                            let sparkCost = 0;
                            if (rarity.includes('uncommon')) sparkCost = 50;
                            else if (rarity.includes('rare') && !rarity.includes('super')) sparkCost = 250;
                            else if (rarity.includes('super') || rarity.includes('event')) sparkCost = 1000;
                            else if (rarity.includes('legendary')) sparkCost = 4000;

                            currentDeckSparkCost += (sparkCost * count);
                            rarityCounts[info.Rarity] = (rarityCounts[info.Rarity] || 0) + count;
                        }

                        if (info.Cost !== null && info.Cost !== undefined) {
                            currentDeckTotalMana += (info.Cost * count);
                            costCurve[info.Cost] = (costCurve[info.Cost] || 0) + count;

                        }
                        if (info.Class) {
                            classCounts[info.Class] = (classCounts[info.Class] || 0) + count;
                            currentDeckClasses.add(info.Class);
                        }

                        if (info.Type) {
                            let broadType = "Fighter / Minion";
                            if (info.Type.includes("Trick")) broadType = "Trick";
                            else if (info.Type.includes("Environment")) broadType = "Environment";
                            typeCounts[broadType] = (typeCounts[broadType] || 0) + count;
                        }

                        if (info.Strength !== null && info.Health !== null) {
                            if (!statsByCost[info.Cost]) {
                                statsByCost[info.Cost] = { str: [], hp: [] };
                            }
                            for (let i = 0; i < count; i++) {
                                statsByCost[info.Cost].str.push(info.Strength);
                                statsByCost[info.Cost].hp.push(info.Health);
                            }
                        }
                    }
                }
            });
            const sortedClasses = Array.from(currentDeckClasses).sort().join(",");

            // If it finds a match, use it. If a deck is somehow mono-class, label it as such.
            const heroName = heroMatrix[sortedClasses] || (sortedClasses ? `Mono: ${sortedClasses}` : "Unknown");
            heroCounts[heroName] = (heroCounts[heroName] || 0) + 1;

            totalUniqueCardSlots += uniqueInThisDeck;

            if (currentDeckSparkCost > 0) {
                if (currentDeckSparkCost > maxSparkCost) {
                    maxSparkCost = currentDeckSparkCost;
                    mostExpensiveDeck = deck;
                }
                if (currentDeckSparkCost < minSparkCost) {
                    minSparkCost = currentDeckSparkCost;
                    leastExpensiveDeck = deck;
                }
            }
            if (currentDeckTotalMana > 0) {
                // Since decks are strictly 40 cards, we can hardcode the divisor
                const avgCost = currentDeckTotalMana / 40;

                if (avgCost > maxAvgCost) {
                    maxAvgCost = avgCost;
                    heaviestDeck = deck;
                }
                if (avgCost < minAvgCost) {
                    minAvgCost = avgCost;
                    lightestDeck = deck;
                }
            }

            // 4. Calculate Synergies
            for (let i = 0; i < deckCardNames.length; i++) {
                for (let j = i + 1; j < deckCardNames.length; j++) {
                    const pair = [deckCardNames[i], deckCardNames[j]].sort();
                    const pairStr = `${pair[0]} + ${pair[1]}`;
                    pairCounts[pairStr] = (pairCounts[pairStr] || 0) + 1;
                }
            }




        });

        const MIN_PAIR_APPEARANCES = 5;
        const normalizedPairsObj = {};

        for (const [pairStr, count] of Object.entries(pairCounts)) {
            if (count >= MIN_PAIR_APPEARANCES) {
                const [cardA, cardB] = pairStr.split(' + ');
                const presenceA = deckPresence[cardA] || 0;
                const presenceB = deckPresence[cardB] || 0;

                const union = presenceA + presenceB - count;
                const jaccardScore = union > 0 ? (count / union) : 0;

                normalizedPairsObj[pairStr] = parseFloat((jaccardScore * 100).toFixed(1));
            }
        }

        // Update Quick Stats DOM
        document.getElementById('statTotalDecks').innerText = totalDecks;
        document.getElementById('statUniqueCards').innerText = Object.keys(cardCopies).length;
        document.getElementById('statAvgVariety').innerText = totalDecks ? (totalUniqueCardSlots / totalDecks).toFixed(1) : 0;

        function getYouTubeId(url) {
            if (!url) return null;
            const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
            return match ? match[1] : null;
        }

        if (document.getElementById('mostP2wDeck') && mostExpensiveDeck && leastExpensiveDeck) {
            // --- Existing P2W DOM Updates ---
            const mostId = getYouTubeId(mostExpensiveDeck.youtube_url);
            document.getElementById('mostP2wDeck').innerText = mostExpensiveDeck.name || mostExpensiveDeck.youtube_title;
            document.getElementById('mostP2wCost').innerText = maxSparkCost.toLocaleString() + ' Sparks';
            if (mostId) document.getElementById('mostP2wImg').src = `https://img.youtube.com/vi/${mostId}/mqdefault.jpg`;
            document.getElementById('mostP2wLink').href = mostExpensiveDeck.youtube_url || "#";

            const leastId = getYouTubeId(leastExpensiveDeck.youtube_url);
            document.getElementById('leastP2wDeck').innerText = leastExpensiveDeck.name || leastExpensiveDeck.youtube_title;
            document.getElementById('leastP2wCost').innerText = minSparkCost.toLocaleString() + ' Sparks';
            if (leastId) document.getElementById('leastP2wImg').src = `https://img.youtube.com/vi/${leastId}/mqdefault.jpg`;
            document.getElementById('leastP2wLink').href = leastExpensiveDeck.youtube_url || "#";

            // --- NEW: Heaviest/Lightest DOM Updates ---
            if (heaviestDeck && lightestDeck) {
                const heaviestId = getYouTubeId(heaviestDeck.youtube_url);
                document.getElementById('heaviestDeck').innerText = heaviestDeck.name || heaviestDeck.youtube_title;
                // Using toFixed(2) to keep the average readable (e.g. "3.45 Avg Cost")
                document.getElementById('heaviestCost').innerText = maxAvgCost.toFixed(2) + ' Avg Cost';
                if (heaviestId) document.getElementById('heaviestImg').src = `https://img.youtube.com/vi/${heaviestId}/mqdefault.jpg`;
                document.getElementById('heaviestLink').href = heaviestDeck.youtube_url || "#";

                const lightestId = getYouTubeId(lightestDeck.youtube_url);
                document.getElementById('lightestDeck').innerText = lightestDeck.name || lightestDeck.youtube_title;
                document.getElementById('lightestCost').innerText = minAvgCost.toFixed(2) + ' Avg Cost';
                if (lightestId) document.getElementById('lightestImg').src = `https://img.youtube.com/vi/${lightestId}/mqdefault.jpg`;
                document.getElementById('lightestLink').href = lightestDeck.youtube_url || "#";
            }
        }

        // Prepare Data for Charts 
        const topCopied = Object.entries(cardCopies).sort((a, b) => b[1] - a[1]);
        const topCopiedSliced = topCopied.slice(0, 15);
        const topPresence = Object.entries(deckPresence).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const yearsSorted = Object.keys(uploadsByYear).sort();
        const topRawPairs = Object.entries(pairCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const topNormalizedPairs = Object.entries(normalizedPairsObj).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const topWords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const costsSorted = Object.keys(costCurve).sort((a, b) => parseInt(a) - parseInt(b));

        // Destroy existing charts AND clear their references
        Object.keys(charts).forEach(key => {
            if (charts[key]) {
                charts[key].destroy();
                delete charts[key]; // <--- This is the magic fix
            }
        });

        const gridColor = '#30363d';
        const textColor = '#8b949e';
        const standardColors = ['#ff7b72', '#79c0ff', '#d2a8ff', '#a5d6ff', '#ffa657', '#3fb950', '#f85149', '#8957e5', '#2f81f7', '#d4ed31'];

        // --- CHART 1: Total Copies ---
        const ctx1 = document.getElementById('topCardsChart').getContext('2d');
        charts.topCards = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: topCopiedSliced.map(i => i[0]),
                datasets: [{ label: 'Total Copies', data: topCopiedSliced.map(i => i[1]), backgroundColor: '#238636', borderRadius: 4, hoverBackgroundColor: '#2ea043' }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                scales: { x: { grid: { color: gridColor }, ticks: { color: textColor } }, y: { ticks: { color: '#c9d1d9' }, grid: { display: false } } },
                plugins: { legend: { display: false }, tooltip: { callbacks: { footer: () => '👉 Click to search for this card' } } },
                onClick: (e, activeElements) => {
                    if (activeElements.length > 0) {
                        // MAGIC FIX: Read the label from the chart directly, not the static array
                        const clickedCard = charts.topCards.data.labels[activeElements[0].index];

                        document.getElementById('statsView').classList.add('hidden');
                        document.getElementById('backBtn').classList.add('hidden');
                        document.getElementById('deckView').classList.remove('hidden');
                        document.getElementById('searchWrapper').classList.remove('hidden');
                        document.getElementById('statsBtn').classList.remove('hidden');
                        const searchInput = document.getElementById('searchInput');
                        searchInput.value = clickedCard;
                        searchInput.dispatchEvent(new Event('input'));
                    }
                },
                onHover: (e, activeElements) => { e.native.target.style.cursor = activeElements.length ? 'pointer' : 'default'; }
            }
        });
       window.applyTopCardsFilter = function (filterValue) {
    if (!charts.topCards) return; // Prevent crashes if chart isn't rendered yet

    let filteredArray = [];

    // Using Object.entries makes pulling the name and count much cleaner
    Object.entries(cardCopies).forEach(([cardName, count]) => {
        if (count === 0) return;

        // --- THE FIX ---
        // Convert "Berry Blast" back to "Berry_Blast" to match the database keys
        const dbKey = cardName.replace(/ /g, '_');
        
        // Now it will actually find the card stats!
        const info = cardDatabase[dbKey] || {}; 
        
        // Categorize safely
        const typeStr = info.Type ? info.Type.toLowerCase() : "";
        const isTrick = typeStr.includes("trick");
        const isEnv = typeStr.includes("environment");
        
        // If it has stats but isn't a trick or environment, it's a fighter/minion
        // We ensure info.Type exists so we don't accidentally count broken lookups as minions
        const isMinion = info.Type && !isTrick && !isEnv;
        
        // Ensure cost is parsed safely as a number
        const cost = parseInt(info.Cost, 10) || 0;

        // Check against the selected filter
        let keep = false;
        if (filterValue === "all") keep = true;
        else if (filterValue === "minion" && isMinion) keep = true;
        else if (filterValue === "trick" && isTrick) keep = true;
        else if (filterValue === "environment" && isEnv) keep = true;
        else if (filterValue === "wincon" && cost >= 5) keep = true;

        if (keep) {
            filteredArray.push([cardName, count]);
        }
    });

    // Sort by count (highest first) and slice the top 15
    filteredArray.sort((a, b) => b[1] - a[1]);
    const newTopSliced = filteredArray.slice(0, 15);

    // Update the chart's data
    charts.topCards.data.labels = newTopSliced.map(i => i[0]);
    charts.topCards.data.datasets[0].data = newTopSliced.map(i => i[1]);

    // Update Colors based on filter
    let newColor = '#238636';       // Default Green
    let hoverColor = '#2ea043';

    if (filterValue === 'trick') { newColor = '#8957e5'; hoverColor = '#a371f7'; } // Purple
    else if (filterValue === 'environment') { newColor = '#58a6ff'; hoverColor = '#79c0ff'; } // Blue
    else if (filterValue === 'wincon') { newColor = '#f85149'; hoverColor = '#ff7b72'; } // Red

    charts.topCards.data.datasets[0].backgroundColor = newColor;
    charts.topCards.data.datasets[0].hoverBackgroundColor = hoverColor;

    // Redraw smoothly
    charts.topCards.update();
};
        // --- CHART 2: Deck Presence ---
        const ctx2 = document.getElementById('deckPresenceChart').getContext('2d');
        charts.deckPresence = new Chart(ctx2, {
            type: 'doughnut',
            data: { labels: topPresence.map(i => i[0]), datasets: [{ data: topPresence.map(i => i[1]), backgroundColor: standardColors, borderColor: '#161b22', borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#c9d1d9', font: { size: 10 } } } } }
        });

        // --- CHART 3: Upload Timeline ---
        const ctx3 = document.getElementById('timelineChart').getContext('2d');
        charts.timeline = new Chart(ctx3, {
            type: 'line',
            data: {
                labels: yearsSorted,
                datasets: [{ label: 'Decks', data: yearsSorted.map(y => uploadsByYear[y]), borderColor: '#58a6ff', backgroundColor: 'rgba(88, 166, 255, 0.2)', borderWidth: 3, tension: 0.3, fill: true, pointBackgroundColor: '#1f6feb', pointRadius: 4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { color: gridColor }, ticks: { color: textColor } }, y: { grid: { color: gridColor }, ticks: { color: textColor, precision: 0 } } }, plugins: { legend: { display: false } } }
        });

        // --- CHART 4: Ultimate Synergies ---
        const ctx4 = document.getElementById('pairsChart').getContext('2d');
        charts.pairs = new Chart(ctx4, {
            type: 'bar',
            data: {
                labels: topRawPairs.map(i => i[0]),
                datasets: [{
                    label: 'Raw Count',
                    data: topRawPairs.map(i => i[1]),
                    backgroundColor: '#8957e5',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: { grid: { color: gridColor }, ticks: { color: textColor } },
                    y: { ticks: { color: '#c9d1d9', font: { size: 10 } }, grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });

        // --- FIX: The Toggle Logic ---
        // Attach to 'window' so the HTML <input onchange="..."> can find it
        window.toggleSynergyChart = function (mode) {
            if (!charts.pairs) return; // Safety check

            if (mode === 'normalized') {
                charts.pairs.data.labels = topNormalizedPairs.map(i => i[0]);
                charts.pairs.data.datasets[0].data = topNormalizedPairs.map(i => i[1]);
                charts.pairs.data.datasets[0].label = 'Overlap %';
                charts.pairs.data.datasets[0].backgroundColor = '#d2a8ff'; // Lighter purple for visual change
            } else {
                charts.pairs.data.labels = topRawPairs.map(i => i[0]);
                charts.pairs.data.datasets[0].data = topRawPairs.map(i => i[1]);
                charts.pairs.data.datasets[0].label = 'Raw Count';
                charts.pairs.data.datasets[0].backgroundColor = '#8957e5'; // Original purple
            }
            charts.pairs.update(); // Redraw the chart
        };

        // Reset the HTML toggle to "Raw" every time we re-render the dashboard (like when changing timeframes)
        const rawToggle = document.getElementById('synergyRaw');
        if (rawToggle) rawToggle.checked = true;

        // --- POPULATE HISTORICAL AUTOCOMPLETE DATALIST ---
const historicalDataList = document.getElementById('historicalOptions');
if (historicalDataList && historicalDataList.options.length === 0 && typeof cardDatabase !== 'undefined') {
    Object.keys(cardDatabase).forEach(rawName => {
        const cleanName = rawName.replace(/_/g, ' ');
        const option = document.createElement('option');
        option.value = cleanName;
        historicalDataList.appendChild(option);
    });
}

// --- NEW CHART: Historical Card Tracker ---
const historicalCtx = document.getElementById('historicalCardChart');

window.updateHistoricalChart = function () {
    if (!historicalCtx) return; // Safety check

    // Grab both inputs (Assuming you rename the first to '1' and add a '2')
    const input1 = document.getElementById('historicalSearchInput1');
    const input2 = document.getElementById('historicalSearchInput2');
    
    const searchInput1 = input1 ? input1.value.trim() : '';
    const searchInput2 = input2 ? input2.value.trim() : '';

    const emptyMsg = document.getElementById('historicalEmptyMsg');
    const canvas = document.getElementById('historicalCardChart');

    // Check if inputs are valid and exist in our filtered data
    const valid1 = searchInput1 && cardPresenceByYear[searchInput1];
    const valid2 = searchInput2 && cardPresenceByYear[searchInput2];

    // If NEITHER input is valid, hide the chart
    if (!valid1 && !valid2) {
        canvas.style.display = 'none';
        emptyMsg.style.display = 'flex';
        return;
    }

    canvas.style.display = 'block';
    emptyMsg.style.display = 'none';

    const years = Object.keys(uploadsByYear).sort();
    const activeDatasets = [];

    // Helper function to generate percentage arrays
    const getPercentages = (cardName) => {
        return years.map(year => {
            const totalDecksThisYear = uploadsByYear[year] || 1; 
            const cardDecksThisYear = cardPresenceByYear[cardName]?.[year] || 0;
            return ((cardDecksThisYear / totalDecksThisYear) * 100).toFixed(1);
        });
    };

    // Build dataset for Card 1 (Blue)
    if (valid1) {
        activeDatasets.push({
            label: `${searchInput1} Usage (%)`,
            data: getPercentages(searchInput1),
            borderColor: '#79c0ff', 
            backgroundColor: 'rgba(121, 192, 255, 0.2)',
            borderWidth: 3,
            tension: 0.3,
            fill: true,
            pointBackgroundColor: '#2f81f7',
            pointRadius: 4,
            pointHoverRadius: 6
        });
    }

    // Build dataset for Card 2 (Coral/Red for contrast)
    if (valid2) {
        activeDatasets.push({
            label: `${searchInput2} Usage (%)`,
            data: getPercentages(searchInput2),
            borderColor: '#ff7b72', 
            backgroundColor: 'rgba(255, 123, 114, 0.2)',
            borderWidth: 3,
            tension: 0.3,
            fill: true,
            pointBackgroundColor: '#f85149',
            pointRadius: 4,
            pointHoverRadius: 6
        });
    }

    // Update existing chart or create a new one
    if (charts.historical) {
        charts.historical.data.labels = years;
        charts.historical.data.datasets = activeDatasets; // Swap in the new array
        charts.historical.update();
    } else {
        charts.historical = new Chart(historicalCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: years,
                datasets: activeDatasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { color: gridColor }, ticks: { color: textColor } },
                    y: {
                        grid: { color: gridColor },
                        ticks: { color: textColor },
                        beginAtZero: true,
                        title: { display: true, text: '% of Decks that year', color: textColor }
                    }
                },
                plugins: {
                    // Make sure legend is visible now that we have multiple lines
                    legend: { display: true, labels: { color: textColor } }, 
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.dataset.label.replace(' Usage (%)', '')}: ${ctx.parsed.y}%`
                        }
                    }
                }
            }
        });
    }
};

// Initialize the chart with the top 2 most popular cards on first load
const historicalInput1 = document.getElementById('historicalSearchInput1');
const historicalInput2 = document.getElementById('historicalSearchInput2');

if (historicalInput1) {
    const defaultCard1 = topCopiedSliced.length > 0 ? topCopiedSliced[0][0] : null;
    const defaultCard2 = topCopiedSliced.length > 1 ? topCopiedSliced[1][0] : null;

    if (defaultCard1) {
        historicalInput1.value = defaultCard1;
        
        // Populate the second input if the element and data exist
        if (historicalInput2 && defaultCard2) {
            historicalInput2.value = defaultCard2;
        }

        // Call the update function once both inputs are populated
        window.updateHistoricalChart();
    } else {
        document.getElementById('historicalCardChart').style.display = 'none';
        document.getElementById('historicalEmptyMsg').style.display = 'flex';
    }
}

        // --- CHART 5: Title Buzzwords ---
        const ctx5 = document.getElementById('buzzwordChart').getContext('2d');
        charts.buzzwords = new Chart(ctx5, {
            type: 'bar',
            data: { labels: topWords.map(i => i[0].toUpperCase()), datasets: [{ data: topWords.map(i => i[1]), backgroundColor: '#f85149', borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { grid: { color: gridColor }, ticks: { color: textColor } }, y: { ticks: { color: '#c9d1d9', font: { weight: 'bold' } }, grid: { display: false } } }, plugins: { legend: { display: false } } }
        });

        // --- CHART 6: Cost Curve ---
        const ctx6 = document.getElementById('costCurveChart').getContext('2d');
        charts.costCurve = new Chart(ctx6, {
            type: 'bar',
            data: {
                labels: costsSorted.map(cost => `Cost ${cost}`),
                datasets: [{ label: 'Total Copies Across Decks', data: costsSorted.map(cost => costCurve[cost]), backgroundColor: '#3fb950', borderRadius: 4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false }, ticks: { color: textColor } }, y: { grid: { color: gridColor }, ticks: { color: textColor } } }, plugins: { legend: { display: false } } }
        });

        // --- CHART 6.5: Hot & Cold Trending Cards ---
        const trendingCanvas = document.getElementById('trendingCardsChart');
        const trendingEmptyMsg = document.getElementById('trendingEmptyMsg');

        if (trendingCanvas) {
            // If we are looking at 50 or fewer decks, trends don't make mathematical sense
            if (totalDecks <= RECENT_DECK_COUNT) {
                trendingCanvas.style.display = 'none';
                if (trendingEmptyMsg) {
                    // Remove the inline display:none and use flex to center it
                    trendingEmptyMsg.style.display = 'flex';
                }
            } else {
                // We have enough data! Show the canvas, hide the message
                trendingCanvas.style.display = 'block';
                if (trendingEmptyMsg) {
                    trendingEmptyMsg.style.display = 'none';
                }

                const trendingScores = [];
                // Use cardCopies instead of allTimeCardFreq since it holds the exact same data
                Object.keys(cardCopies).forEach(card => {
                    const allTimeAvg = cardCopies[card] / totalDecks;
                    const recentAvg = (recentCardFreq[card] || 0) / RECENT_DECK_COUNT;
                    const delta = recentAvg - allTimeAvg;

                    if (cardCopies[card] >= 10 || (recentCardFreq[card] || 0) >= 4) {
                        trendingScores.push({ name: card, delta: delta });
                    }
                });

                trendingScores.sort((a, b) => b.delta - a.delta);

                const hottest = trendingScores.slice(0, 5);
                const coldest = trendingScores.slice(-5);
                const hotAndCold = [...hottest, ...coldest];

                const ctx10 = trendingCanvas.getContext('2d');
                charts.trending = new Chart(ctx10, {
                    type: 'bar',
                    data: {
                        labels: hotAndCold.map(item => item.name),
                        datasets: [{
                            label: 'Usage Change',
                            data: hotAndCold.map(item => item.delta.toFixed(2)),
                            backgroundColor: hotAndCold.map(item => item.delta > 0 ? '#ff7b72' : '#58a6ff'),
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: function (context) {
                                        const val = context.raw;
                                        return val > 0 ? `🔥 Trending Up: +${val} copies/deck` : `🧊 Trending Down: ${val} copies/deck`;
                                    }
                                }
                            }
                        },
                        scales: {
                            x: { grid: { color: gridColor }, ticks: { color: textColor } },
                            y: { ticks: { color: '#c9d1d9', font: { weight: 'bold' } }, grid: { display: false } }
                        }
                    }
                });
            }
        }

       // --- CHART 7: Class Dominance ---
const ctx7 = document.getElementById('classRadarChart').getContext('2d');

// Sort the classes by count (highest to lowest) to create a smooth shape
const sortedClassEntries = Object.entries(classCounts).sort((a, b) => b[1] - a[1]);
const sortedClassLabels = sortedClassEntries.map(e => e[0]);
const sortedClassData = sortedClassEntries.map(e => e[1]);

charts.classDominance = new Chart(ctx7, {
    type: 'radar',
    data: {
        labels: sortedClassLabels,
        datasets: [{ 
            label: 'Total Copies Across Decks', 
            data: sortedClassData, 
            backgroundColor: 'rgba(210, 168, 255, 0.4)', 
            borderColor: '#d2a8ff', 
            pointBackgroundColor: '#a371f7', 
            borderWidth: 2,
            tension: 0.3 // NEW: Curves the lines between points to reduce jaggedness
        }]
    },
    options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        scales: { 
            r: { 
                beginAtZero: true, // NEW: Keeps the center anchored
                grid: { color: gridColor }, 
                angleLines: { color: gridColor }, 
                ticks: { display: false }, 
                pointLabels: { color: '#c9d1d9', font: { size: 12 } } 
            } 
        }, 
        plugins: { 
            legend: { display: false } 
        } 
    }
});

       // --- CHART 10: Hero Playrates (Toggleable Radar) ---

        // 1. Define the base lists to determine who belongs to which faction
        const plantHeroes = [
            "Captain Combustible", "Chompzilla", "Citron / Beta-Carrotina",
            "Grass Knuckles", "Green Shadow", "Nightcap", "Rose",
            "Solar Flare", "Spudow", "Wall-Knight"
        ];
        const zombieHeroes = [
            "Brain Freeze", "Electric Boogaloo", "Immorticia", "Impfinity",
            "Neptuna", "Professor Brainstorm", "Rustbolt", "Super Brainz / HG",
            "The Smash", "Z-Mech"
        ];

        // NEW: Helper function to map counts AND sort them from highest to lowest
        const getSortedHeroData = (heroList) => {
            // Pair the heroes with their counts
            const paired = heroList.map(hero => ({
                name: hero,
                count: heroCounts[hero] || 0
            }));
            
            // Sort descending by count
            paired.sort((a, b) => b.count - a.count);
            
            // Return separated arrays for Chart.js
            return {
                labels: paired.map(item => item.name),
                data: paired.map(item => item.count)
            };
        };

        // 2. Initialize the chart with sorted Plant data
        const initialPlantData = getSortedHeroData(plantHeroes);
        
        const ctx10 = document.getElementById('heroChart').getContext('2d');
        charts.heroPlayrates = new Chart(ctx10, {
            type: 'radar',
            data: {
                labels: initialPlantData.labels,
                datasets: [{
                    label: 'Decks Played',
                    data: initialPlantData.data,
                    backgroundColor: 'rgba(63, 185, 80, 0.3)', // Green for plants
                    borderColor: '#3fb950',
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#3fb950',
                    pointHoverBackgroundColor: '#ffffff',
                    pointHoverBorderColor: '#3fb950',
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    tension: 0.3 // Keeps the lines between points curved
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        pointLabels: { color: '#c9d1d9', font: { size: 11 } },
                        ticks: { display: false, backdropColor: 'transparent' },
                        beginAtZero: true // Anchors the center smoothly
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(22, 27, 34, 0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#c9d1d9',
                        borderColor: '#30363d',
                        borderWidth: 1,
                        callbacks: {
                            label: function (context) {
                                return ` ${context.raw} Decks`;
                            }
                        }
                    }
                }
            }
        });

        // 3. Tab Click Event Listeners to swap data smoothly
        document.querySelectorAll('.hero-tab').forEach(tab => {
            tab.onclick = (e) => {
                // Remove active class from all tabs, add to clicked tab
                document.querySelectorAll('.hero-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');

                const faction = e.target.getAttribute('data-faction');
                const dataset = charts.heroPlayrates.data.datasets[0];

                if (faction === 'plants') {
                    const sortedPlants = getSortedHeroData(plantHeroes);
                    charts.heroPlayrates.data.labels = sortedPlants.labels;
                    dataset.data = sortedPlants.data;
                    
                    dataset.backgroundColor = 'rgba(63, 185, 80, 0.3)'; // Plant Green
                    dataset.borderColor = '#3fb950';
                    dataset.pointBorderColor = '#3fb950';
                } else {
                    const sortedZombies = getSortedHeroData(zombieHeroes);
                    charts.heroPlayrates.data.labels = sortedZombies.labels;
                    dataset.data = sortedZombies.data;
                    
                    dataset.backgroundColor = 'rgba(137, 87, 229, 0.3)'; // Zombie Purple
                    dataset.borderColor = '#8957e5';
                    dataset.pointBorderColor = '#8957e5';
                }

                // Animate the transition
                charts.heroPlayrates.update();
            };
        });

        // --- CHART 9: Average Deck Composition (Card Types) ---
        // Ensure typeCounts has fallback values to prevent undefined errors
        const minions = typeCounts["Fighter / Minion"] || 0;
        const tricks = typeCounts["Trick"] || 0;
        const environments = typeCounts["Environment"] || 0;

        const avgMinions = allDecks.length ? (minions / allDecks.length).toFixed(1) : 0;
        const avgTricks = allDecks.length ? (tricks / allDecks.length).toFixed(1) : 0;
        const avgEnvironments = allDecks.length ? (environments / allDecks.length).toFixed(1) : 0;

        const ctx9 = document.getElementById('averageDeckChart').getContext('2d');
        charts.averageDeck = new Chart(ctx9, {
            type: 'doughnut',
            data: {
                labels: ['Minions', 'Tricks', 'Environments'],
                datasets: [{
                    data: [avgMinions, avgTricks, avgEnvironments],
                    // Green for Minions, Purple for Tricks, Blue for Environments
                    backgroundColor: ['#3fb950', '#8957e5', '#58a6ff'],
                    borderColor: '#161b22',
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#c9d1d9' } },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return ` ${context.raw} cards per deck`;
                            }
                        }
                    }
                }
            }
        });

    }


});