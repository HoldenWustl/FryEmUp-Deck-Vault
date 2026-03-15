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
    const crafterBtn = document.getElementById('crafterBtn');
    const crafterView = document.getElementById('crafterView');

    // --- Fetch Database ---
   // --- 1. SET UP A "DATA LOADED" FLAG ---
let isDataLoaded = false; 

// --- 2. YOUR FETCH CALLS (Slightly updated) ---
// We use Promise.all to wait for BOTH JSON files to finish downloading
Promise.all([
    fetch('deck_database_final.json').then(res => {
        if (!res.ok) throw new Error("Could not load the database file.");
        return res.json();
    }),
    fetch('card_data.json').then(res => {
        if (!res.ok) throw new Error("Could not load the card data file.");
        return res.json();
    })
])
.then(([deckData, cardData]) => {
    // Both files are successfully downloaded!
    fullDatabase = deckData;
    cardDatabase = cardData;

    loadingEl.style.display = 'none';
    const totalDecks = Object.keys(deckData).length;
    deckCountEl.textContent = totalDecks;
    
    // We set our flag to true, meaning it is safe to draw charts now.
    isDataLoaded = true;
    
    // Kick off the initial render of the main deck list
    renderDecks(fullDatabase);

    // KICK OFF THE ROUTER NOW THAT WE HAVE DATA!
    handleRouting(); 
})
.catch(error => {
    loadingEl.textContent = `Error loading data: ${error.message}`;
    console.error("Fetch error:", error);
});
function handleRouting() {
    // IMPORTANT: If the data hasn't finished downloading yet, stop right here!
    // The Promise.all block above will call handleRouting() again once it is ready.
    if (!isDataLoaded) return; 

    const hash = window.location.hash;

    // Hide absolutely everything first
    deckView.classList.add('hidden');
    statsView.classList.add('hidden');
    crafterView.classList.add('hidden');
    searchWrapper.classList.add('hidden');
    statsBtn.classList.add('hidden');
    crafterBtn.classList.add('hidden');
    if (typeof backBtn !== 'undefined') backBtn.classList.add('hidden');

    if (hash === '#stats') {
        statsView.classList.remove('hidden');
        if (typeof backBtn !== 'undefined') backBtn.classList.remove('hidden');
        
        // It is now safe to render the chart because we know fullDatabase exists!
        const currentLimit = document.getElementById('deckLimitFilter') ? document.getElementById('deckLimitFilter').value : 'all';
        renderStatsChart(currentLimit);

    } else if (hash === '#crafter') {
        crafterView.classList.remove('hidden');
        if (typeof backBtn !== 'undefined') backBtn.classList.remove('hidden');

    } else {
        deckView.classList.remove('hidden');
        searchWrapper.classList.remove('hidden');
        statsBtn.classList.remove('hidden');
        crafterBtn.classList.remove('hidden');
    }
}
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
    const searchInput = document.getElementById('searchInput');
    const statsBtn = document.getElementById('statsBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');

    // 1. Show loader and disable controls BEFORE rendering
    if (loadingIndicator) loadingIndicator.classList.remove('hidden');
    deckGrid.classList.add('hidden'); // Hide the grid while building
    if (statsBtn) statsBtn.disabled = true;
    if (crafterBtn) crafterBtn.disabled = true;

    // Use a setTimeout so the browser has a split second to paint the loading 
    // spinner and disable the buttons before locking up to do the heavy rendering
    setTimeout(() => {
        deckGrid.innerHTML = '';
        
        // OPTIMIZATION: Create a Document Fragment. 
        // This builds all HTML in memory first, rather than forcing the browser 
        // to redraw the page thousands of times inside the loop.
        const fragment = document.createDocumentFragment();

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
            
            // Append to the in-memory fragment, not the live DOM
            fragment.appendChild(cardEl);
        }

        // 2. Append everything to the live DOM at once!
        deckGrid.appendChild(fragment);

        // 3. Hide loader and re-enable controls AFTER rendering
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
        deckGrid.classList.remove('hidden');
        if (statsBtn) statsBtn.disabled = false;
        if (crafterBtn) crafterBtn.disabled = false;

    }, 50); // 50ms delay allows the UI to show the loading state first
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
    statsBtn.addEventListener('click', () => {
    // Hide Main UI & Crafter Button
    deckView.classList.add('hidden');
    searchWrapper.classList.add('hidden');
    statsBtn.classList.add('hidden');
    crafterBtn.classList.add('hidden'); // Hide the new button

    // Show Stats UI
    statsView.classList.remove('hidden');
    backBtn.classList.remove('hidden');

    // Read the dropdown value when opening stats
    const currentLimit = document.getElementById('deckLimitFilter') ? document.getElementById('deckLimitFilter').value : 'all';
    renderStatsChart(currentLimit);
});
crafterBtn.addEventListener('click', () => {
    // Hide Main UI & Stats Button
    deckView.classList.add('hidden');
    searchWrapper.classList.add('hidden');
    statsBtn.classList.add('hidden');
    crafterBtn.classList.add('hidden'); 

    // Show Crafter UI
    crafterView.classList.remove('hidden');
    backBtn.classList.remove('hidden');
});

    // NEW: Listen for when the user changes the dropdown
    const filterDropdown = document.getElementById('deckLimitFilter');
    if (filterDropdown) {
        filterDropdown.addEventListener('change', (e) => {
            renderStatsChart(e.target.value);
        });
    }

   backBtn.addEventListener('click', () => {
    // Hide BOTH secondary views and the back button
    statsView.classList.add('hidden');
    crafterView.classList.add('hidden'); // Hide the new view
    backBtn.classList.add('hidden');

    // Restore Main UI
    deckView.classList.remove('hidden');
    searchWrapper.classList.remove('hidden');
    statsBtn.classList.remove('hidden');
    crafterBtn.classList.remove('hidden'); // Restore the new button
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


    // --- AI DECK BUILDER: SMART SEED MANAGEMENT ---
// Map alphabetical class combos to their specific PvZ Heroes
const heroMap = {
    // Plants
    "Mega-Grow,Smarty": "Green Shadow",
    "Kabloom,Solar": "Solar Flare",
    "Guardian,Solar": "Wall-Knight",
    "Mega-Grow,Solar": "Chompzilla",
    "Guardian,Kabloom": "Spudow",
    "Guardian,Smarty": "Citron / Beta-Carrotina", // Both share these classes
    "Guardian,Mega-Grow": "Grass Knuckles",
    "Kabloom,Smarty": "Nightcap",
    "Kabloom,Mega-Grow": "Captain Combustible",
    "Smarty,Solar": "Rose",
    
    // Zombies
    "Brainy,Sneaky": "Super Brainz / Huge-Gigantacus",
    "Beastly,Hearty": "The Smash",
    "Crazy,Sneaky": "Impfinity",
    "Brainy,Hearty": "Rustbolt",
    "Beastly,Crazy": "Electric Boogaloo",
    "Beastly,Sneaky": "Brain Freeze",
    "Brainy,Crazy": "Professor Brainstorm",
    "Beastly,Brainy": "Immorticia",
    "Crazy,Hearty": "Z-Mech",
    "Hearty,Sneaky": "Neptuna"
};
const plantClasses = new Set(["Mega-Grow", "Kabloom", "Smarty", "Guardian", "Solar"]);
let currentSeeds = []; 
let currentFaction = null; 
let activeClasses = new Set(); 

const seedInput = document.getElementById('seedSearchInput');
const suggestionsBox = document.getElementById('smartSuggestions');
const seedList = document.getElementById('seedList');
const emptySeedMsg = document.getElementById('emptySeedMsg');
const generateDeckBtn = document.getElementById('generateDeckBtn');
const clearSeedsBtn = document.getElementById('clearSeedsBtn'); // NEW: Grab the Clear button

// Helper: Get total number of cards currently seeded
const getTotalCards = () => currentSeeds.reduce((sum, seed) => sum + seed.count, 0);

// 1. Smart Autocomplete (Filters as you type)
seedInput.addEventListener('input', function() {
    const query = this.value.toLowerCase().trim();
    suggestionsBox.innerHTML = ''; 

    // STRICT CHECK: Max 4 unique seed cards
    if (currentSeeds.length >= 4) {
        suggestionsBox.innerHTML = '<li style="color: #ff7b72; justify-content: center;">Maximum of 4 seed cards reached!</li>';
        suggestionsBox.style.display = 'block';
        return;
    }

    // STRICT CHECK: Max 40 cards total
    if (getTotalCards() >= 40) {
        suggestionsBox.innerHTML = '<li style="color: #ff7b72; justify-content: center;">Deck is full (40 cards)!</li>';
        suggestionsBox.style.display = 'block';
        return;
    }

    if (query.length < 2) {
        suggestionsBox.style.display = 'none';
        return;
    }

    let matches = 0;
    Object.keys(cardDatabase).forEach(rawName => {
        if (matches >= 15) return; 
        
        const cleanName = rawName.replace(/_/g, ' ');
        if (cleanName.toLowerCase().includes(query)) {
            const cardInfo = cardDatabase[rawName];
            const cardClass = cardInfo.Class;
            const cardFaction = plantClasses.has(cardClass) ? "Plant" : "Zombie";

            if (currentFaction !== null && currentFaction !== cardFaction) return; 
            if (!activeClasses.has(cardClass) && activeClasses.size >= 2) return; 
            if (currentSeeds.some(s => s.name === rawName)) return; 

            const li = document.createElement('li');
            li.innerHTML = `<span>${cleanName}</span> <span class="suggestion-class">${cardClass}</span>`;
            li.onclick = () => addSeed(rawName, cardClass, cardFaction);
            suggestionsBox.appendChild(li);
            matches++;
        }
    });

    suggestionsBox.style.display = matches > 0 ? 'block' : 'none';
});

// Hide dropdown if clicked outside
document.addEventListener('click', (e) => {
    if (e.target !== seedInput && e.target !== suggestionsBox) {
        suggestionsBox.style.display = 'none';
    }
});

// 2. Add Seed (Handles the 40-card limit)
function addSeed(rawName, cardClass, cardFaction) {
    const spaceLeft = 40 - getTotalCards();
    if (spaceLeft <= 0) return;

    // Add 4 copies, OR however many slots are left before hitting 40
    const amountToAdd = Math.min(4, spaceLeft);

    currentSeeds.push({ name: rawName, count: amountToAdd, class: cardClass, faction: cardFaction });
    currentFaction = cardFaction;
    activeClasses.add(cardClass);

    seedInput.value = '';
    suggestionsBox.style.display = 'none';
    renderSeeds();
}

// 3. Render the UI
function renderSeeds() {
    seedList.innerHTML = '';
    const totalCards = getTotalCards();

    if (currentSeeds.length === 0) {
        seedList.appendChild(emptySeedMsg);
        emptySeedMsg.style.display = 'block';
        generateDeckBtn.disabled = true;
        currentFaction = null;
        activeClasses.clear();
        return;
    }

    emptySeedMsg.style.display = 'none';
    generateDeckBtn.disabled = false;

    currentSeeds.forEach(seed => {
        const li = document.createElement('li');
        li.className = 'seed-item';
        const displayName = seed.name.replace(/_/g, ' '); 
        
        // Disable the plus button if the card is at x4 OR the deck is at 40 cards
        const disablePlus = seed.count >= 4 || totalCards >= 40;

        li.innerHTML = `
            <div class="seed-info">
                <span class="seed-name">${displayName}</span>
                <span class="seed-meta">${seed.class}</span>
            </div>
            <div class="seed-controls">
                <button class="seed-btn minus-btn" data-name="${seed.name}">-</button>
                <span class="seed-count">${seed.count}</span>
                <button class="seed-btn plus-btn" data-name="${seed.name}" ${disablePlus ? 'disabled' : ''}>+</button>
            </div>
        `;
        seedList.appendChild(li);
    });

    attachQuantityListeners();
}

// 4. Handle + and - logic
function attachQuantityListeners() {
    document.querySelectorAll('.minus-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const name = e.target.getAttribute('data-name');
            const seed = currentSeeds.find(s => s.name === name);
            if (seed) {
                seed.count--;
                if (seed.count <= 0) {
                    currentSeeds = currentSeeds.filter(s => s.name !== name);
                    activeClasses.clear();
                    currentSeeds.forEach(s => activeClasses.add(s.class));
                }
                renderSeeds();
            }
        });
    });

    document.querySelectorAll('.plus-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const name = e.target.getAttribute('data-name');
            const seed = currentSeeds.find(s => s.name === name);
            // Extra check to ensure we don't breach 40
            if (seed && seed.count < 4 && getTotalCards() < 40) {
                seed.count++;
                renderSeeds();
            }
        });
    });
}

// 5. RESTORED: Clear All logic
if (clearSeedsBtn) {
    clearSeedsBtn.addEventListener('click', () => {
        currentSeeds = [];
        currentFaction = null;
        activeClasses.clear();
        seedInput.value = '';
        renderSeeds();
    });
}

// --- AI DECK BUILDER: SYNERGY ENGINE ---

let synergyMatrix = null;

// 1. Build the Matrix (Runs only once to save processing power)
function initSynergyMatrix() {
    if (synergyMatrix) return; // Already built!
    synergyMatrix = {};
    console.log("Building Synergy Matrix...");

    Object.values(fullDatabase).forEach(deck => {
        // Clean the card names by slicing off the "x3 " part
        const cleanCards = deck.cards.map(c => c.substring(c.indexOf(' ') + 1).trim());

        for (let i = 0; i < cleanCards.length; i++) {
            const cardA = cleanCards[i];
            if (!synergyMatrix[cardA]) synergyMatrix[cardA] = {};
            
            for (let j = 0; j < cleanCards.length; j++) {
                if (i === j) continue; // Don't score a card against itself
                const cardB = cleanCards[j];
                
                // Tally every time Card A and Card B appear in the same deck
                synergyMatrix[cardA][cardB] = (synergyMatrix[cardA][cardB] || 0) + 1;
            }
        }
    });
    console.log("Synergy Matrix complete!");
}

// 2. Generate the Deck
generateDeckBtn.addEventListener('click', () => {
    initSynergyMatrix(); // Ensure matrix is ready
    
    // Disable button to prevent spam clicks
    generateDeckBtn.disabled = true;
    generateDeckBtn.innerText = "Calculating Synergies...";

    // Use a tiny timeout to allow the button text to update before the heavy math freezes the UI
    setTimeout(() => {
        const finalDeck = buildOptimizedDeck();
        renderGeneratedDeck(finalDeck);
        
        generateDeckBtn.disabled = false;
        generateDeckBtn.innerText = "Generate Synergy Deck";
    }, 50);
});

// 3. The Core Algorithm (Updated with Class Discovery)
function buildOptimizedDeck() {
    let workingDeck = currentSeeds.map(s => ({...s}));
    let workingClasses = new Set(activeClasses);
    let deckFaction = currentFaction;
    let totalCards = workingDeck.reduce((sum, c) => sum + c.count, 0);

    while (totalCards < 40) {
        let bestCard = null;
        let bestScore = -1;

        const forceSecondClass = workingClasses.size === 1;

        Object.keys(cardDatabase).forEach(candidateName => {
            const candidateData = cardDatabase[candidateName];
            const candidateClass = candidateData.Class;
            const candidateFaction = plantClasses.has(candidateClass) ? "Plant" : "Zombie";

            if (candidateFaction !== deckFaction) return; 
            if (!workingClasses.has(candidateClass) && workingClasses.size >= 2) return; 
            if (forceSecondClass && workingClasses.has(candidateClass)) return;

            const existingCopy = workingDeck.find(c => c.name === candidateName);
            const currentCopies = existingCopy ? existingCopy.count : 0;
            if (currentCopies >= 4) return; 

            // Base Synergy
            let score = 0;
            workingDeck.forEach(deckCard => {
                if (synergyMatrix && synergyMatrix[candidateName] && synergyMatrix[candidateName][deckCard.name]) {
                    score += synergyMatrix[candidateName][deckCard.name] * deckCard.count;
                }
            });

            if (score === 0) score = 0.1;

            // --- THE NEW MULTIPLIERS ---
            // Buffed from 25% to 50%. This heavily encourages the AI to finish the 4th copy!
            if (currentCopies > 0) score *= (1 + (currentCopies * 0.50));

            // Temperature
            const variance = 0.9 + (Math.random() * 0.2);
            score *= variance;

            if (score > bestScore) {
                bestScore = score;
                bestCard = candidateName;
            }
        });

        // Add the winning card
        if (bestCard) {
            const existing = workingDeck.find(c => c.name === bestCard);
            if (existing) {
                // If it's already in the deck, just add 1 more to push it toward x4
                existing.count++;
                totalCards++;
            } else {
                // NEW RULE: If it's a brand new card, add a playset of 3 at once!
                // (Unless we are at 38 or 39 cards, then just fill the remaining space)
                const spaceLeft = 40 - totalCards;
                const copiesToAdd = Math.min(3, spaceLeft);

                workingDeck.push({
                    name: bestCard,
                    count: copiesToAdd,
                    class: cardDatabase[bestCard].Class,
                    cost: cardDatabase[bestCard].Cost 
                });
                workingClasses.add(cardDatabase[bestCard].Class);
                totalCards += copiesToAdd;
            }
        } else {
            console.warn("Algorithm stalled! Not enough valid cards.");
            break;
        }
    }

    return workingDeck;
}

// 4. Render the Resulting Deck (Updated with Faction Mana Symbols)
// --- "PSEUDO-AI" DECK NAMING ENGINE ---
// --- "PSEUDO-AI" DECK NAMING ENGINE (EXPANDED) ---
function generateDeckName(deck, isPlant) {
    // Faction-specific adjectives
    const plantAdjectives = [
        "Blooming", "Verdant", "Photosynthetic", "Savage", "Radiant", 
        "Overgrown", "Rooted", "Spicy", "Leafy", "Sun-Soaked", 
        "Vengeful", "Primal", "Flourishing", "Thorny", "Botanical", 
        "Wild", "Untamed", "Raging", "Solar", "Fierce", "Bark-Biting", 
        "Bountiful", "Vibrant", "Enraged", "Majestic", "Vineswept"
    ];
    
    const zombieAdjectives = [
        "Undead", "Toxic", "Gargantuan", "Vicious", "Ruthless", 
        "Chaotic", "Dastardly", "Sneaky", "Brain-Hungry", "Galvanized", 
        "Necrotic", "Ghastly", "Mad", "Cryptic", "Shambling", 
        "Bizarre", "Mechanical", "Grotesque", "Apocalyptic", "Relentless", 
        "Monstrous", "Vile", "Cybernetic", "Diabolical", "Mutated", "Stinky"
    ];
    
    // Playstyle nouns
    const nouns = [
        "Assault", "Synergy", "Brigade", "Beatdown", "Control", 
        "Swarm", "Uprising", "Horde", "Protocol", "Rush", 
        "Aggro", "Tempo", "Engine", "Onslaught", "Vanguard", 
        "Tactics", "Ambush", "March", "Legion", "Blitz", 
        "Rebellion", "Syndicate", "Empire", "Invasion", "Cartel", "Offensive"
    ];

    // Find the "Boss Monster" (a prominent card you have 3 or 4 copies of)
    const coreCards = deck.filter(c => c.count >= 3);
    let signatureCardName = "Mystery";
    
    if (coreCards.length > 0) {
        // Pick a random core card to be the star
        const randomCore = coreCards[Math.floor(Math.random() * coreCards.length)];
        signatureCardName = randomCore.name.replace(/_/g, ' ');
    } else {
        // Fallback: just grab the most expensive card
        const highestCost = deck.reduce((prev, current) => (prev.cost > current.cost) ? prev : current);
        signatureCardName = highestCost.name.replace(/_/g, ' ');
    }

    // Pick random words
    const prefixes = isPlant ? plantAdjectives : zombieAdjectives;
    const adj = prefixes[Math.floor(Math.random() * prefixes.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];

    // Randomize the format of the title
    const formats = [
        `The ${signatureCardName} ${noun}`,
        `${adj} ${signatureCardName}`,
        `${signatureCardName} Protocol`,
        `Project: ${signatureCardName}`,
        `${adj} ${signatureCardName} ${noun}`,
        `Dawn of the ${signatureCardName}`,
        `Rise of the ${signatureCardName}`,
        `${signatureCardName} Awakening`,
        `Operation: ${signatureCardName}`,
        `The ${signatureCardName} Incident`,
        `Return of the ${signatureCardName}`,
        `${signatureCardName} Overdrive`,
        `Beware the ${signatureCardName}`,
        `Secret ${signatureCardName} Society`,
        `${signatureCardName} and Friends`,
        `The ${adj} ${noun}` // Example: "The Toxic Swarm"
    ];

    return formats[Math.floor(Math.random() * formats.length)];
}


// 4. Render the Resulting Deck (UPDATED WITH NAMING ENGINE)
function renderGeneratedDeck(deck) {
    const resultsContainer = document.getElementById('generatedDeckList');
    const title = document.getElementById('generatedDeckTitle');
    
    resultsContainer.innerHTML = '';
    title.classList.remove('hidden');

    // Sort by Cost, then Alphabetical
    deck.sort((a, b) => {
        const costA = cardDatabase[a.name].Cost;
        const costB = cardDatabase[b.name].Cost;
        if (costA !== costB) return costA - costB;
        return a.name.localeCompare(b.name);
    });

    // --- IDENTIFY THE HERO ---
    const classArray = Array.from(new Set(deck.map(c => c.class))).sort();
    const classKey = classArray.join(',');
    const heroName = heroMap[classKey] || `Any ${classArray.join(' / ')} Hero`;

    // --- GENERATE THE AI NAME ---
    const isPlant = currentFaction === "Plant";
    const aiDeckName = generateDeckName(deck, isPlant);

    // Update Title with the AI Name AND the Hero!
    title.innerHTML = `
        <div style="font-size: 1.2em; color: var(--accent); font-style: italic;">"${aiDeckName}"</div>
        <div style="font-size: 0.75em; color: var(--text-secondary); margin-top: 5px;">A Deck for ${heroName}</div>
    `;

    const manaSymbol = isPlant ? '☀️' : '🧠';
    const manaColor = isPlant ? '#e3c800' : '#b259db';

    deck.forEach(card => {
        const div = document.createElement('div');
        div.className = 'generated-card-item';
        // Note: I swapped these hardcoded colors to use your CSS variables from earlier so it matches the theme perfectly!
        div.style.padding = '10px';
        div.style.background = 'var(--card-bg)';
        div.style.border = '1px solid rgba(255, 255, 255, 0.05)';
        div.style.borderRadius = '6px';
        div.style.marginBottom = '5px';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';

        const displayName = card.name.replace(/_/g, ' ');
        const cost = cardDatabase[card.name].Cost;

        div.innerHTML = `
            <span><span style="color: ${manaColor}; font-weight: bold;">${cost}${manaSymbol}</span> ${displayName}</span>
            <span style="font-weight: bold; color: var(--accent);">x${card.count}</span>
        `;
        resultsContainer.appendChild(div);
    });
}

// --- ROUTING LOGIC ---

window.addEventListener('hashchange', handleRouting);

statsBtn.addEventListener('click', () => {
    window.location.hash = 'stats';
});

crafterBtn.addEventListener('click', () => {
    window.location.hash = 'crafter';
});

if (typeof backBtn !== 'undefined') {
    backBtn.addEventListener('click', () => {
        window.location.hash = ''; // Clearing the hash triggers the default Home UI
    });
}
});