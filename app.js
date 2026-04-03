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
    const gamesView = document.getElementById('gamesView');
const gamesBtn = document.getElementById('gamesBtn');

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
    if (!isDataLoaded) return; 

    const hash = window.location.hash;

    // 1. Hide absolutely everything first
    deckView.classList.add('hidden');
    statsView.classList.add('hidden');
    crafterView.classList.add('hidden');
    gamesView.classList.add('hidden'); // <-- NEW
    searchWrapper.classList.add('hidden');
    statsBtn.classList.add('hidden');
    crafterBtn.classList.add('hidden');
    gamesBtn.classList.add('hidden');  // <-- NEW
    if (typeof backBtn !== 'undefined') backBtn.classList.add('hidden');

    // 2. Determine what to show based on the hash
    if (hash === '#stats') {
        statsView.classList.remove('hidden');
        if (typeof backBtn !== 'undefined') backBtn.classList.remove('hidden');
        
        const currentLimit = document.getElementById('deckLimitFilter') ? document.getElementById('deckLimitFilter').value : 'all';
        if (typeof renderStatsChart === 'function') renderStatsChart(currentLimit);

    } else if (hash === '#crafter') {
        crafterView.classList.remove('hidden');
        if (typeof backBtn !== 'undefined') backBtn.classList.remove('hidden');

    } else if (hash === '#games') { // <-- NEW ROUTE
        gamesView.classList.remove('hidden');
        if (typeof backBtn !== 'undefined') backBtn.classList.remove('hidden');
        if (typeof renderGames === 'function') renderGames();

    } else {
        // Default Home UI
        deckView.classList.remove('hidden');
        searchWrapper.classList.remove('hidden');
        statsBtn.classList.remove('hidden');
        crafterBtn.classList.remove('hidden');
        gamesBtn.classList.remove('hidden'); // <-- NEW
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
    if (gamesBtn) gamesBtn.disabled = true;

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
               
           <div class="deck-controls-wrapper">
    
    <details class="video-dropdown" 
             ontoggle="this.closest('.deck-card').querySelector('.video-preview').classList.toggle('hidden', !this.open)">
        <summary>View Video</summary>
    </details>
    
    <details class="visual-deck-details">
        <summary class="view-visual-btn" 
                 data-title="${deckInfo.name}" 
                 data-cards="${encodeURIComponent(JSON.stringify(deckInfo.cards))}">
            View Visual Deck
        </summary>
    </details>

</div>

<div class="video-preview hidden">
    <a href="${deckInfo.youtube_url}" target="_blank" title="${deckInfo.youtube_title}">
        <img src="${thumbnailUrl}" alt="Video Thumbnail" loading="lazy">
        <div class="video-title-overlay">${deckInfo.youtube_title}</div>
    </a>
</div>

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
        if (gamesBtn) gamesBtn.disabled = false;

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
                       const clickedCard = charts.topCards.data.labels[activeElements[0].index];

// 1. Change the hash to let the site's router handle the view switching (showing deckView, hiding statsView, etc.)
window.location.hash = '#'; 

// 2. Wait a split second for the site's view transition to finish, then run the search
setTimeout(() => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = clickedCard;
        searchInput.dispatchEvent(new Event('input'));
    }
}, 50);
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
const currentTopCardsFilter = document.getElementById('topCardsFilter').value;
if (currentTopCardsFilter !== 'all') {
    window.applyTopCardsFilter(currentTopCardsFilter);
}
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
let cardFrequencies = null;
let cardAverageCopies = null; // NEW: Track the average copies used per deck

// 1. Build the Matrix (UPDATED WITH META-AWARENESS TIME WEIGHTS & AVERAGE COPIES)
function initSynergyMatrix() {
    if (synergyMatrix) return; 
    synergyMatrix = {};
    cardFrequencies = {}; 
    cardAverageCopies = {}; 

    const decks = Object.values(fullDatabase);

    // --- STEP A: Find the date thresholds ---
    // Extract all valid timestamps, fallback to 0 if missing/invalid
    const deckTimestamps = decks.map(d => {
        const time = d.upload_date ? new Date(d.upload_date).getTime() : 0;
        return isNaN(time) ? 0 : time;
    });

    // Sort ascending (oldest first, newest last)
    deckTimestamps.sort((a, b) => a - b);

    const totalDecks = deckTimestamps.length;
    // Find the timestamp boundaries for our percentiles
    const threshold50 = deckTimestamps[Math.floor(totalDecks * 0.50)]; // 50th percentile
    const threshold05 = deckTimestamps[Math.floor(totalDecks * 0.95)]; // 95th percentile (Top 5%)

    // --- STEP B: Build the matrix using weighted values ---
    decks.forEach(deck => {
        
        let deckWeight = 0.2; // Oldest 50% of decks are only worth 1/5th of a point!
        
        const time = deck.upload_date ? new Date(deck.upload_date).getTime() : 0;
        const validTime = isNaN(time) ? 0 : time;

        if (validTime >= threshold05) {
            deckWeight = 5.0; // Top 5% most recent decks count for 5.0x!
        } else if (validTime >= threshold50) {
            deckWeight = 1.0; // Top 50% most recent decks count as standard 1x
        }

        // --- THE FIX: Parse BOTH the count and the name ---
        const parsedCards = deck.cards.map(c => {
            const firstSpace = c.indexOf(' ');
            
            // Handles "x3", "3x", or "3". Strips the "x" and converts to integer.
            const countStr = c.substring(0, firstSpace).replace(/x/i, '');
            const count = parseInt(countStr) || 1; 
            
            // Everything after the first space is the card name
            const cardName = c.substring(firstSpace + 1).trim();
            
            return { name: cardName, count: count };
        });

        // Map just the names for the synergy loops below
        const cleanCards = parsedCards.map(pc => pc.name);

        // --- Track Frequencies AND Average Copies ---
        parsedCards.forEach(card => {
            // 1. Tally how many decks each card appears in overall
            cardFrequencies[card.name] = (cardFrequencies[card.name] || 0) + deckWeight;

            // 2. Track total copies played to find the average per deck
            if (!cardAverageCopies[card.name]) {
                cardAverageCopies[card.name] = { total: 0, appearances: 0 };
            }
            
            // Multiply by weight so modern deck copy counts influence the average more heavily
            cardAverageCopies[card.name].total += (card.count * deckWeight);
            cardAverageCopies[card.name].appearances += deckWeight;
        });

        // --- STEP C: Build the Synergy Matrix ---
        for (let i = 0; i < cleanCards.length; i++) {
            const cardA = cleanCards[i];
            if (!synergyMatrix[cardA]) synergyMatrix[cardA] = {};
            
            for (let j = 0; j < cleanCards.length; j++) {
                if (i === j) continue; 
                const cardB = cleanCards[j];
                
                // Add the weight instead of just "1"
                synergyMatrix[cardA][cardB] = (synergyMatrix[cardA][cardB] || 0) + deckWeight;
            }
        }
    });
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
        generateDeckBtn.innerText = "Generate Deck";
    }, 50);
});

function buildOptimizedDeck() {
    let workingDeck = currentSeeds.map(s => ({...s}));
    let workingClasses = new Set(activeClasses);
    let deckFaction = currentFaction;
    
    const rawWeight = 0.25 + (Math.random() * 0.30);
    const affinityWeight = 1.0 - rawWeight;
    
    // Check if Budget Mode is active
    const budgetToggle = document.getElementById('budgetToggle');
    const isBudget = budgetToggle ? budgetToggle.checked : false;
    
    while (true) {
        // Recalculate totals at the start of every loop
        let totalCards = workingDeck.reduce((sum, c) => sum + c.count, 0);
        if (totalCards >= 40) break;

        // Calculate current budget consumption
        let expensiveCount = workingDeck.reduce((sum, c) => {
            if (!cardDatabase[c.name]) return sum;
            const r = cardDatabase[c.name].Rarity;
            return (r === "Super-Rare" || r === "Event") ? sum + c.count : sum;
        }, 0);

        let bestCard = null;
        let bestScore = -1;

        let candidatePool = Object.keys(cardDatabase);
        
        // "Closing Door" Logic to prevent late-game orphans
        const slotsLeft = 40 - totalCards;
        const currentOrphans = workingDeck.filter(c => c.count === 1).length;

        if (slotsLeft <= currentOrphans || slotsLeft === 1) {
            candidatePool = workingDeck.map(c => c.name);
        }

        candidatePool.forEach(candidateName => {
            const candidateData = cardDatabase[candidateName];
            const candidateClass = candidateData.Class;
            const candidateFaction = plantClasses.has(candidateClass) ? "Plant" : "Zombie";

            // Basic game logic filters
            if (candidateFaction !== deckFaction) return; 
            if (!workingClasses.has(candidateClass) && workingClasses.size >= 2) return; 

            const existingCopy = workingDeck.find(c => c.name === candidateName);
            const currentCopies = existingCopy ? existingCopy.count : 0;
            if (currentCopies >= 4) return; 

            // --- NEW: BUDGET FILTERS ---
            if (isBudget) {
                const rarity = candidateData.Rarity;
                if (rarity === "Legendary") return; // Hard ban on Legendaries

                if (rarity === "Super-Rare" || rarity === "Event") {
                    // The Soft Ceiling: Only allow a BRAND NEW expensive card if we have 
                    // enough budget room (17 or fewer) to potentially make it a 3x or 4x.
                    // If it's already in the deck (currentCopies > 0), let it upgrade.
                    if (currentCopies === 0 && expensiveCount > 17) return; 
                }
            }

            let score = 0;

            // Core Synergy Loop
            workingDeck.forEach(deckCard => {
                if (synergyMatrix && synergyMatrix[candidateName] && synergyMatrix[candidateName][deckCard.name]) {
                    const coOccurrences = synergyMatrix[candidateName][deckCard.name];
                    const candidateTotalPlays = cardFrequencies[candidateName] || 1;
                    
                    let rawSynergy = coOccurrences;
                    let affinitySynergy = (coOccurrences * coOccurrences) / candidateTotalPlays;
                    let blendedSynergy = (rawSynergy * rawWeight) + (affinitySynergy * affinityWeight);
                    
                    const isOriginalSeed = currentSeeds.some(s => s.name === deckCard.name);

                    let classModifier = 1.0;
                    if (cardDatabase[candidateName].Class !== cardDatabase[deckCard.name].Class) {
                        classModifier = 3.5; 
                    }
                    
                    score += (blendedSynergy * classModifier) * deckCard.count * (isOriginalSeed ? 3 : 1);
                }
            });

            if (score === 0) score = 0.1;

            // Dynamic Consistency & Meta Scaling
            let avgCopies = 3; 
            if (cardAverageCopies && cardAverageCopies[candidateName]) {
                avgCopies = cardAverageCopies[candidateName].total / cardAverageCopies[candidateName].appearances;
            }

            let consistencyMultiplier = 1.0;

            if (currentCopies === 1) {
                consistencyMultiplier = 75.0; 
            } else if (currentCopies === 2) {
                consistencyMultiplier = 1.5; 
            }

            if (currentCopies >= Math.round(avgCopies)) {
                consistencyMultiplier *= 0.5; 
            }

            score *= consistencyMultiplier;
            score *= (0.85 + (Math.random() * 0.3));

            if (score > bestScore) {
                bestScore = score;
                bestCard = candidateName;
            }
        });

        if (bestCard) {
            const existing = workingDeck.find(c => c.name === bestCard);
            if (existing) {
                existing.count++;
            } else {
                workingDeck.push({
                    name: bestCard,
                    count: 1, 
                    class: cardDatabase[bestCard].Class,
                    cost: cardDatabase[bestCard].Cost 
                });
                workingClasses.add(cardDatabase[bestCard].Class);
            }
        } else {
            break; 
        }
    }
    return workingDeck;
}

// 4. Render the Resulting Deck (Updated with Faction Mana Symbols)
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
// Variable to store the formatted text for the clipboard
let currentClipboardText = "";

function renderGeneratedDeck(deck) {
    const resultsContainer = document.getElementById('generatedDeckList');
    const title = document.getElementById('generatedDeckTitle');
    const copyBtn = document.getElementById('copyDeckBtn');
    
    // Clean out previous results and apply our perfect grid CSS class!
    resultsContainer.innerHTML = '';
    resultsContainer.className = 'visual-deck-grid'; // Reuses the modal grid layout!
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

    // Update Title with the AI Name AND the Hero
    title.innerHTML = `
        <div style="font-size: 1.2em; color: var(--accent); font-style: italic;">"${aiDeckName}"</div>
        <div style="font-size: 0.75em; color: var(--text-secondary); margin-top: 5px;">A Deck for ${heroName}</div>
    `;

    // --- START BUILDING THE CLIPBOARD STRING ---
    currentClipboardText = `Deck: ${aiDeckName}\nHero: ${heroName}\n\n`;

    // Build the visual cards
    deck.forEach(card => {
        // Handle names safely (clipboard wants spaces, image paths want underscores)
        const displayName = card.name.replace(/_/g, ' '); 
        const dbName = displayName.replace(/ /g, '_'); 

        // Create the card container
        const cardDiv = document.createElement('div');
        cardDiv.className = 'visual-card'; // Reuses the hover and drop-shadow styling

        // Create the image
        const img = document.createElement('img');
        img.src = `card_images/${dbName}.png`;
        img.alt = displayName;
        img.title = displayName; // Shows the name on hover
        
        // Fallback for .webp
        img.onerror = function() {
            this.onerror = null; 
            this.src = `card_images/${dbName}.webp`;
        };

        // Create the sleek bottom-left badge
        const badge = document.createElement('div');
        badge.className = 'card-quantity';
        badge.textContent = `x${card.count}`;

        // Put it all together
        cardDiv.appendChild(img);
        cardDiv.appendChild(badge);
        resultsContainer.appendChild(cardDiv);

        // --- ADD CARD TO CLIPBOARD STRING ---
        currentClipboardText += `${card.count}x ${displayName}\n`;
    });

    // Show the copy button and reset its text just in case
    copyBtn.classList.remove('hidden');
    copyBtn.innerText = "Copy to Clipboard";
}

// --- ADD THE CLICK LISTENER ---
document.getElementById('copyDeckBtn').addEventListener('click', (e) => {
    if (!currentClipboardText) return;

    // Use the modern Clipboard API
    navigator.clipboard.writeText(currentClipboardText).then(() => {
        // Give the user visual feedback!
        const btn = e.target;
        btn.innerText = "Copied!";
        btn.style.background = "#4CAF50"; // Turn it green briefly

        setTimeout(() => {
            btn.innerText = "Copy to Clipboard";
            btn.style.background = ""; // Reset to your CSS class default
        }, 2000);
    }).catch(err => {
        console.error("Failed to copy text: ", err);
    });
});

// --- ROUTING LOGIC ---

window.addEventListener('hashchange', handleRouting);

statsBtn.addEventListener('click', () => {
    window.location.hash = 'stats';
});

crafterBtn.addEventListener('click', () => {
    window.location.hash = 'crafter';
});

gamesBtn.addEventListener('click', () => { // <-- NEW
    window.location.hash = 'games';
});

if (typeof backBtn !== 'undefined') {
    backBtn.addEventListener('click', () => {
        window.location.hash = ''; // Clearing the hash triggers the default Home UI
    });
}
});

// --- Modal Elements ---
const modal = document.getElementById('deckVisualModal');
const modalTitle = document.getElementById('modalDeckTitle');
const modalGrid = document.getElementById('modalDeckGrid');
const closeModalBtn = document.querySelector('.close-modal-btn');

// --- Event Delegation for "View Visual Deck" buttons ---
// We attach the listener to the whole grid instead of 1700 individual buttons
document.getElementById('deckGrid').addEventListener('click', function(e) {
    if (e.target.classList.contains('view-visual-btn')) {
        e.preventDefault();
        const title = e.target.getAttribute('data-title');
        const cardsArray = JSON.parse(decodeURIComponent(e.target.getAttribute('data-cards')));
        
        openVisualModal(title, cardsArray);
    }
});

function openVisualModal(title, cardsArray) {
    modalTitle.textContent = title;
    modalGrid.innerHTML = ''; // Clear previous deck

    // Loop directly through the strings in your array
    cardsArray.forEach(cardString => {
        // Regex magic: It looks for "x" followed by numbers, a space, then the name
        const match = cardString.trim().match(/^x(\d+)\s+(.+)$/i);
        
        let count = 1;
        let rawName = cardString; // Fallback just in case

        if (match) {
            count = parseInt(match[1], 10); // Extracts the '2'
            rawName = match[2];             // Extracts 'Hot Lava'
        }

        const displayName = rawName.replace(/_/g, ' ');
        const dbName = displayName.replace(/ /g, '_');

        const cardDiv = document.createElement('div');
        cardDiv.className = 'visual-card';

        const img = document.createElement('img');
        img.src = `card_images/${dbName}.png`;
        img.alt = displayName;
        img.title = displayName;
        img.style.objectFit = 'contain';
        
        // The magic fallback: if .png fails, instantly try .webp
        img.onerror = function() {
            this.onerror = null; 
            this.src = `card_images/${dbName}.webp`;
        };

        const badge = document.createElement('div');
        badge.className = 'card-quantity';
        badge.textContent = `x${count}`;

        cardDiv.appendChild(img);
        cardDiv.appendChild(badge);
        modalGrid.appendChild(cardDiv);
    });

    // Show the modal
    modal.classList.remove('hidden');
}
// --- Close Modal Logic ---
closeModalBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
});

// Close modal if user clicks the dark background outside the content
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.add('hidden');
    }
});
function renderGames() {
    // 1. Setup the Daily Seed
    const today = new Date();
    const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const dateSum = today.getFullYear() + today.getMonth() + today.getDate();
    
    // Convert your object to a sorted array of keys so everyone gets the same card
    const cardKeys = Object.keys(cardDatabase).sort();
    const dailyCardKey = cardKeys[dateSum % cardKeys.length]; 
    const dailyCard = cardDatabase[dailyCardKey];

    // 2. Grab DOM Elements
    const canvas = document.getElementById('silhouetteCanvas');
    const ctx = canvas.getContext('2d');
    const inputArea = document.getElementById('silhouetteInputArea');
    const guessInput = document.getElementById('silhouetteGuess');
    const submitBtn = document.getElementById('silhouetteSubmitBtn');
    const feedbackEl = document.getElementById('silhouetteFeedback');
    const hintsContainer = document.getElementById('silhouetteHints');

    // 3. State Management variables
    const savedDate = localStorage.getItem('silhouetteDate');
    const isSolved = localStorage.getItem('silhouetteSolved') === 'true';
    let wrongGuesses = parseInt(localStorage.getItem('silhouetteGuesses') || '0');

    if (savedDate !== dateString) {
        // New day! Reset everything.
        localStorage.setItem('silhouetteDate', dateString);
        localStorage.setItem('silhouetteSolved', 'false');
        localStorage.setItem('silhouetteGuesses', '0');
        wrongGuesses = 0;
        setupUnsolvedState();
    } else if (isSolved) {
        setupSolvedState();
    } else {
        setupUnsolvedState();
    }

    // --- State Helper Functions ---
   // --- State Helper Functions ---
    function setupUnsolvedState() {
        canvas.style.filter = 'blur(18px) grayscale(100%)'; 
        inputArea.style.display = 'block';
        feedbackEl.textContent = '';
        updateHintsDisplay();
    }

    function setupSolvedState() {
        canvas.style.filter = 'blur(0px) grayscale(0%)';
        inputArea.style.display = 'none';
        feedbackEl.textContent = `You got it! It was ${dailyCard.Name.replace(/_/g, ' ')}!`;
        feedbackEl.style.color = '#4CAF50';
        updateHintsDisplay(); 
    }

    // --- Progressive Hint Logic ---
    function updateHintsDisplay() {
        if (wrongGuesses > 0) {
            hintsContainer.style.display = 'block';
            
            // FIXED: Updated hints order to Class -> Rarity -> Cost
            if (wrongGuesses >= 1) {
                document.getElementById('hint1').classList.remove('hidden');
                document.getElementById('hint1Text').textContent = `Class: ${dailyCard.Class}`;
            }
            if (wrongGuesses >= 2) {
                document.getElementById('hint2').classList.remove('hidden');
                document.getElementById('hint2Text').textContent = `Rarity: ${dailyCard.Rarity}`;
            }
            if (wrongGuesses >= 3) {
                document.getElementById('hint3').classList.remove('hidden');
                document.getElementById('hint3Text').textContent = `Cost: ${dailyCard.Cost}`;
            }
        } else {
            hintsContainer.style.display = 'none';
            document.getElementById('hint1').classList.add('hidden');
            document.getElementById('hint2').classList.add('hidden');
            document.getElementById('hint3').classList.add('hidden');
        }
    }

    // --- Autocomplete Logic ---
    const suggestionsBox = document.getElementById('silhouetteSuggestions');
    let selectedRawName = null; // Stores the exact DB key when clicked

    guessInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        suggestionsBox.innerHTML = ''; 
        selectedRawName = null; // Reset selection on typing

        if (query.length < 2) {
            suggestionsBox.style.display = 'none';
            return;
        }

        let matches = 0;
        Object.keys(cardDatabase).forEach(rawName => {
            if (matches >= 2) return; // Keep dropdown small
            
            const cleanName = rawName.replace(/_/g, ' ');
            if (cleanName.toLowerCase().includes(query)) {
                const cardInfo = cardDatabase[rawName];
                
                const li = document.createElement('li');
                // Reusing your exact suggestion styling
                li.innerHTML = `<span>${cleanName}</span> <span class="suggestion-class">${cardInfo.Class}</span>`;
                
                li.onclick = () => {
                    guessInput.value = cleanName;
                    selectedRawName = rawName; // Save exact database key
                    suggestionsBox.style.display = 'none';
                    newSubmitBtn.click(); // Auto-submit when clicked
                };
                
                suggestionsBox.appendChild(li);
                matches++;
            }
        });

        suggestionsBox.style.display = matches > 0 ? 'block' : 'none';
    });

    // Hide suggestions if clicking outside
    document.addEventListener('click', (e) => {
        if (e.target !== guessInput) suggestionsBox.style.display = 'none';
    });

    // --- Handle the Guess ---
    const newSubmitBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
    
    newSubmitBtn.addEventListener('click', () => {
        // Use the selected DB key from autocomplete, or try to format their manual text
        const actualNameKey = dailyCardKey.toLowerCase();
        let guessKeyToTest = selectedRawName ? selectedRawName.toLowerCase() : guessInput.value.trim().toLowerCase().replace(/\s+/g, '_');

        if (guessKeyToTest === actualNameKey) {
            // Correct Guess!
            localStorage.setItem('silhouetteSolved', 'true');
            setupSolvedState();
        } else {
            // Wrong Guess!
            wrongGuesses++;
            localStorage.setItem('silhouetteGuesses', wrongGuesses.toString());
            
            feedbackEl.textContent = "Incorrect. Try again!";
            feedbackEl.style.color = '#f44336';
            
            updateHintsDisplay(); 
            guessInput.value = '';
            guessInput.focus();
        }
    });

   const imgObj = new Image();
    
    imgObj.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // This math scales the image perfectly inside the canvas (like background-size: contain)
        const scale = Math.min(canvas.width / imgObj.width, canvas.height / imgObj.height);
        const x = (canvas.width / 2) - (imgObj.width / 2) * scale;
        const y = (canvas.height / 2) - (imgObj.height / 2) * scale;
        ctx.drawImage(imgObj, x, y, imgObj.width * scale, imgObj.height * scale);
    };

    imgObj.onerror = function() {
        this.onerror = null; // Prevent infinite loop
        this.src = `card_images/${dailyCardKey}.webp`;
    };

    imgObj.src = `card_images/${dailyCardKey}.png`;

// ==========================================
// HIGHER OR LOWER LOGIC
// ==========================================

let deckCounts = {};
let validHlCards = [];
let hlStreak = 0;
let hlBestStreak = parseInt(localStorage.getItem('hlBestStreak') || '0');
let currentCardLeft = null;
let currentCardRight = null;
let hlIsAnimating = false; // Prevents spam clicking
let hlIsGameOver = false;

// 1. Calculate how many decks every card is in
Object.keys(cardDatabase).forEach(card => deckCounts[card] = 0);

Object.values(fullDatabase).forEach(deck => {
    deck.cards.forEach(cardString => {
        // Remove the "x4 " or "x3 " prefix to get the raw card name
        const cleanName = cardString.replace(/^x\d\s+/, '');
        if (deckCounts[cleanName] !== undefined) {
            deckCounts[cleanName]++;
        } else {
            // Fallback in case a card is in a deck but missing from cardDatabase
            deckCounts[cleanName] = 1; 
        }
    });
});

// We only want to play with cards that actually exist in the database
validHlCards = Object.keys(deckCounts);

// 2. DOM Elements
const hlCardLeftEl = document.getElementById('hlCardLeft');
const hlCardRightEl = document.getElementById('hlCardRight');
const hlGameOverEl = document.getElementById('hlGameOver');
const hlStreakEl = document.getElementById('hlStreak');
const hlBestEl = document.getElementById('hlBest');
hlBestEl.textContent = hlBestStreak;

// Helper to set images with your .png to .webp fallback
function setHlImage(imgElement, cardKey) {
    imgElement.src = `card_images/${cardKey}.png`;
    imgElement.onerror = function() {
        this.onerror = null;
        this.src = `card_images/${cardKey}.webp`;
    };
}

// Helper to get a random card that isn't the current one
function getRandomHlCard(excludeCard) {
    let randomCard;
    do {
        randomCard = validHlCards[Math.floor(Math.random() * validHlCards.length)];
    } while (randomCard === excludeCard);
    return randomCard;
}

// 3. Render function
function renderHlState() {
    // Setup Left Card (Count is now HIDDEN)
    document.getElementById('hlNameLeft').textContent = currentCardLeft.replace(/_/g, ' ');
    document.getElementById('hlCountLeft').textContent = `??? Decks`;
    setHlImage(document.getElementById('hlImgLeft'), currentCardLeft);

    // Setup Right Card (Count is HIDDEN)
    document.getElementById('hlNameRight').textContent = currentCardRight.replace(/_/g, ' ');
    document.getElementById('hlCountRight').textContent = `??? Decks`;
    setHlImage(document.getElementById('hlImgRight'), currentCardRight);
}

// 5. Handle user guess
function handleHlGuess(clickedSide) {
    // --- NEW: Stop immediately if animating OR if the game is over ---
    if (hlIsAnimating || hlIsGameOver) return; 
    hlIsAnimating = true;

    const countLeft = deckCounts[currentCardLeft];
    const countRight = deckCounts[currentCardRight];

    // Trigger the satisfying tick-up effect over 800ms
    animateValue(document.getElementById('hlCountLeft'), 0, countLeft, 800);
    animateValue(document.getElementById('hlCountRight'), 0, countRight, 800);

    // Determine if they were right (Ties go to the player)
    let isCorrect = false;
    if (clickedSide === 'left' && countLeft >= countRight) isCorrect = true;
    if (clickedSide === 'right' && countRight >= countLeft) isCorrect = true;

    const clickedElement = clickedSide === 'left' ? hlCardLeftEl : hlCardRightEl;

    if (isCorrect) {
        hlStreak++;
        hlStreakEl.textContent = hlStreak;
        
        // High Score Logic
        if (hlStreak > hlBestStreak) {
            hlBestStreak = hlStreak;
            hlBestEl.textContent = hlBestStreak;
            localStorage.setItem('hlBestStreak', hlBestStreak.toString());
        }
        
        clickedElement.classList.add('hl-correct');
        
        // Wait 1.5 seconds then advance
        setTimeout(() => {
            clickedElement.classList.remove('hl-correct');
            hlCardLeftEl.classList.add('hl-fade-out');
            hlCardRightEl.classList.add('hl-fade-out');
            
            // 2. Wait 300ms for them to disappear, swap data, then fade back in
            setTimeout(() => {
                currentCardLeft = currentCardRight;
                currentCardRight = getRandomHlCard(currentCardLeft);
                renderHlState();
                
                hlCardLeftEl.classList.remove('hl-fade-out');
                hlCardRightEl.classList.remove('hl-fade-out');
                
                // Unlock game after fade-in completes
                setTimeout(() => { hlIsAnimating = false; }, 300);
            }, 300); 
            
        }, 1200);

    } else {
        // --- NEW: Instantly lock the game so they can't click anything else ---
        hlIsGameOver = true; 
        
        clickedElement.classList.add('hl-wrong');
        
        // Wait 1.5 seconds so they can see the final numbers before game over menu
        setTimeout(() => {
            clickedElement.classList.remove('hl-wrong');
            hlGameOverEl.style.display = 'block';
        }, 1500);
    }
}

// Satisfying Number Ticking Animation
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        // Ease-out effect (starts fast, slows down at the end)
        const easeProgress = 1 - Math.pow(1 - progress, 3); 
        const currentVal = Math.floor(easeProgress * (end - start) + start);
        
        obj.textContent = `${currentVal} Decks`;
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.textContent = `${end} Decks`; // Ensure it lands exactly on the target
        }
    };
    window.requestAnimationFrame(step);
}

// 4. Start/Restart Game
function startHigherLower() {
    hlIsGameOver = false; 
    hlIsAnimating = false; // --- FIXED: Reset the animation lock on restart ---
    hlStreak = 0;
    hlStreakEl.textContent = hlStreak;
    hlGameOverEl.style.display = 'none';
    
    // Clear any leftover animation classes
    hlCardLeftEl.classList.remove('hl-correct', 'hl-wrong', 'hl-fade-out');
    hlCardRightEl.classList.remove('hl-correct', 'hl-wrong', 'hl-fade-out');

    currentCardLeft = getRandomHlCard(null);
    currentCardRight = getRandomHlCard(currentCardLeft);
    
    renderHlState();
}



// 6. Event Listeners
hlCardLeftEl.onclick = () => handleHlGuess('left');
hlCardRightEl.onclick = () => handleHlGuess('right');
document.getElementById('hlRestartBtn').onclick = startHigherLower;

// Initialize the game
startHigherLower();

// ==========================================
// TRIVIA GAME LOGIC
// ==========================================

const triviaQuestions = [
    // --- META & GAME HISTORY ---
    { question: "Which of these cards was originally a Super-Rare before being upgraded to a Legendary in a later patch?", answer: "Valkyrie", wrong: ["Trickster", "Zombot 1000", "Octo Zombie"] },
    { question: "In the early days of PvZ Heroes, what was the maximum number of cards you could hold in your hand before milling?", answer: "10", wrong: ["9", "12", "Unlimited"] },
    { question: "In the competitive community, what does the term 'RNG' stand for when referring to cards like Bad Moon Rising?", answer: "Random Number Generation", wrong: ["Real Ninja Gaming", "Rapid Number Growth", "Running New Gear"] },
    { question: "The 'Galactic Gardens' update introduced what major new mechanic to the game?", answer: "Environments", wrong: ["Tokens", "Superpowers", "Evolution cards"] },
    { question: "Which keyword made its first appearance in the 'Triassic Triumph' card set?", answer: "Fusion", wrong: ["Dino-Roar", "Evolution", "Untrickable"] },
    { question: "Which keyword made its first appearance in the 'Colossal Fossils' card set?", answer: "Dino-Roar", wrong: ["Fusion", "Deadly", "Strikethrough"] },
    { question: "Before it received a major nerf to balance its power, how much Sun did 'Briar Rose' originally cost?", answer: "4 Sun", wrong: ["3 Sun", "5 Sun", "6 Sun"] },
    { question: "What was the original cost of 'Sow Magic Beans' before it was nerfed to no longer draw a card?", answer: "2 Sun", wrong: ["1 Sun", "3 Sun", "4 Sun"] },
    { question: "What was the original amount of Brains given by 'Medulla Nebula' when played upon, before it was nerfed?", answer: "3 Brains", wrong: ["2 Brains", "4 Brains", "1 Brain"] },
    { question: "What was the original ability of 'Disco-Naut' before being nerfed?", answer: "Zombies with 3 or less attack have Bullseye", wrong: ["All Dancing Zombies have Bullseye", "Zombies with 2 or less attack have Bullseye", "Zombies with 4 or less attack have Bullseye"] },
    { question: "Octo Zombie's ability to return to your hand after being destroyed used to be a keyword trait. What was it called?", answer: "Afterlife", wrong: ["Undying", "Rebirth", "Immortal"] },
    { question: "What was the original ability of Z-Mech's 'Missile Madness' superpower before it was reworked?", answer: "Attack for 2 damage in 3 random lanes", wrong: ["Do 3 damage to all Plants", "Destroy a Plant with 4 or less attack", "Do 4 damage to a Plant and 1 to the Plant Hero"] },
    { question: "Which Plant environment had its cost increased from 2 Sun to 3 Sun due to its dominance in the meta?", answer: "Spikeweed Sector", wrong: ["Solar Winds", "Venus Flytraplanet", "Coffee Grounds"] },
    { question: "Which famous competitive Plant deck archetype revolves around Astro-Shroom, Admiral Navy Bean, and Planet of the Grapes?", answer: "Cyclecap", wrong: ["Heal Midrange", "Ramp to Mime", "Aggro Flare"] },
    {
    question: "If the Plant Hero's deck has exactly 0 cards left and it becomes their turn to draw, what happens?",
    answer: "They instantly lose the game.",
    wrong: [
      "They simply don't draw a card and the game continues normally.",
      "They take increasing 'fatigue' damage each turn.",
      "The game ends in an automatic draw."
    ]
  },
    // --- DEEP MECHANICS ---
    { question: "Exactly how many 'charges' are required to completely fill the Super-Block meter?", answer: "8", wrong: ["10", "6", "9"] },
    { question: "If a Plant Hero has a full hand of 10 cards, what happens when they Super-Block?", answer: "They mill their Superpower and get nothing", wrong: ["They play the Superpower immediately for free", "They draw a card anyway", "The Super-Block meter resets to 0 but saves the power"] },
    { question: "What happens if a Zombie with 'Frenzy' destroys a Plant with 0 Attack?", answer: "It does a bonus attack", wrong: ["Nothing", "It heals to full health", "It gains +1/+1"] },
    { question: "What happens if an 'Overshoot' Zombie is fronted by a Plant?", answer: "It does its Overshoot damage to the Hero, then attacks the Plant normally", wrong: ["It only attacks the Plant", "It ignores the Plant and attacks the Hero entirely", "It loses its Overshoot ability for that turn"] },
    { question: "If a Zombie Hero has 1 Health, and a Plant with 3 Attack and 'Bullseye' hits them while their block meter is 1 charge away from full, what happens?", answer: "The Zombie Hero takes 3 damage and loses", wrong: ["They Super-Block and survive", "They take 1 damage and block the rest", "The game ends in a draw"] },
    { question: "What does the 'Untrickable' trait actually do?", answer: "Makes the card unaffected by the opponent's tricks", wrong: ["Cannot be Bounced", "Immune to environments", "Cannot be destroyed by combat damage"] },
    { question: "If a Space Cowboy destroys a Potato Mine, what happens?", answer: "It moves before the mine explodes, dodging the damage", wrong: ["It takes 2 damage and dies", "It gets destroyed, but moves first", "It stays in the lane and takes 2 damage"] },
    { question: "What happens if a plant is Bounced back to your hand after having its stats changed by Onion Rings?", answer: "It retains its 4/4 stats in your hand", wrong: ["It reverts to its original stats", "It costs 4 Sun to play", "It becomes a 1/1"] },
    { question: "If Sneezing Zombie is on the field, can the Plant Hero play 'Second-Best Taco of All Time' to draw a card?", answer: "No, the card cannot be played at all", wrong: ["Yes, but it only draws a card and doesn't heal", "Yes, and it heals anyway due to a bug", "Yes, but they take 2 damage instead"] },
    { question: "What happens if a Mixed-Up Gravedigger is revealed from a Gravestone?", answer: "Its 'When Played' effect does not activate", wrong: ["It activates again, putting everything in Gravestones", "It destroys all Plants", "It gains +1/+1"] },
    { question: "Can Dandy Lion King's ability deal the finishing blow to defeat the Zombie Hero?", answer: "No, because the damage rounds down to 0", wrong: ["Yes, if they are at 1 health", "Yes, if paired with Heartichoke", "No, because it only targets Plants"] },
    { question: "What visually happens if a Zombie shrunk by Shrinking Violet is Bounced or put into a Gravestone?", answer: "Its size glitches and it becomes extremely large", wrong: ["It becomes microscopic", "It turns completely invisible", "It turns into a 1/1 Goat"] },
    { question: "What happens if a Supernova Gargantuar destroys a Wing-Nut?", answer: "It destroys all Wing-Nuts on the board and then does a Bonus Attack", wrong: ["It just destroys the Wing-Nut", "It does a Bonus Attack but other Wing-Nuts survive", "It destroys all Wing-Nuts but cannot Bonus Attack"] },
    { question: "Does the 'Untrickable' trait protect a card from friendly tricks, such as Doom-Shroom?", answer: "No, friendly tricks will still affect and destroy them", wrong: ["Yes, they are completely immune", "Yes, but only if they are Plants", "No, but they take half damage"] },
    { question: "What happens if a Zombie Chicken or Fire Rooster is played in the same lane as a Toadstool or Chomper?", answer: "The plant destroys it before it gets a chance to move", wrong: ["The zombie moves away safely", "The plant misses and destroys nothing", "The zombie moves, but the plant destroys a random zombie"] },
    { question: "If Immorticia plays Witch's Familiar while a Zookeeper is on the board, what happens?", answer: "Zookeeper's ability triggers twice", wrong: ["Zookeeper's ability triggers once", "The Zookeeper is destroyed", "All Pets gain +2/+2 permanently"] },
    { question: "If a Plant has 'Double Strike' and attacks a Zombie with 'Deadly', what happens?", answer: "The Plant dies after the first attack and does not perform its bonus attack", wrong: ["The Plant survives", "The Plant performs its bonus attack then dies", "The Zombie loses its Deadly trait"] },
    { question: "Can a 'Gravitree' pull a Zombie that is currently hiding inside a Gravestone?", answer: "No, Gravestones are completely unaffected", wrong: ["Yes, it pulls the Gravestone to its lane", "Yes, but it reveals the Zombie first", "Yes, but only if it's an environment"] },

    // --- TOKENS & UNCOLLECTABLES ---
    { question: "Which of these is an uncollectable Token card?", answer: "Pot of Gold", wrong: ["Leprechaun Imp", "Fire Rooster", "Turkey Rider"] },
    { question: "How many cards does the token 'Pot of Gold' let you draw?", answer: "3", wrong: ["2", "4", "1"] },
    { question: "What tokens are generated when the Plant 'Mayflower' hits the Zombie Hero?", answer: "A random Squash, Bean, or Corn", wrong: ["A random Flower", "A random Fruit", "A random Peashooter"] },
    { question: "What token does the trick 'Gargantuar's Feast' create?", answer: "3 random Gargantuars", wrong: ["3 random 1-cost Zombies", "1 Zombot 1000", "3 random Science Zombies"] },
    { question: "Which Zombie card generates the uncollectable 'Pot of Gold' token?", answer: "Leprechaun Imp", wrong: ["Regifting Zombie", "Wormhole Gatekeeper", "Trick-or-Treater"] },
    { question: "Which Token card is created when you play a 'Gargantuar-Throwing Imp'?", answer: "Smashing Gargantuar", wrong: ["Imp-Throwing Gargantuar", "Swab", "Zombot 1000"] },
    { question: "What is the name of the unique Token Zombie created by the 'Octo Zombie'?", answer: "Octo-Pet", wrong: ["Squid Zombie", "Kraken", "Tentacle"] },

    // --- SPECIFIC CARD KNOWLEDGE ---
    { question: "Which Plant has the highest base Attack stat in the game without buffs?", answer: "Poison Oak", wrong: ["Super-Phat Beets", "Grapes of Wrath", "Dark Matter Dragonfruit"] },
    { question: "What are the exact base stats of 'Dark Matter Dragonfruit'?", answer: "6/6", wrong: ["6/5", "7/7", "5/6"] },
    { question: "What unique effect does 'Dark Matter Dragonfruit' have on the Zombie player?", answer: "Zombie Tricks cost 6 more", wrong: ["Zombies cost 2 more", "Zombie Tricks cost 2 more", "Zombie Environments cannot be played"] },
    { question: "What is the only Zombie card in the entire game that costs 11 Brains?", answer: "Gargantuar's Feast", wrong: ["Zombot 1000", "Bad Moon Rising", "Octo Zombie"] },
    { question: "What is the exact ability of the 'Galacta-Cactus' when destroyed?", answer: "Does 1 damage to everything", wrong: ["Does 2 damage to the Zombie Hero", "Destroys a random Zombie", "Gives all Plants Bullseye"] },
    { question: "What are the stats and cost of the 'Swab' (Swabbie) Zombie?", answer: "0-cost 1/1", wrong: ["1-cost 1/1", "0-cost 2/1", "1-cost 2/2"] },
    { question: "Which Zombie trick destroys all Plants with 2 or less Attack?", answer: "Weed Spray", wrong: ["Rolling Stone", "The Chickening", "Bungee Plumber"] },
    { question: "Which Zombie card states 'When played: All Zombies get +1/+1 for the rest of the game'?", answer: "Intergalactic Warlord", wrong: ["Primeval Yeti", "Zombie King", "Zombot Drone Engineer"] },
    { question: "Which Plant does exactly 6 damage to the Zombie Hero when it is destroyed?", answer: "Grapes of Wrath", wrong: ["Cherry Bomb", "Berry Blast", "Doom-Shroom"] },
    { question: "Which 1-cost Plant has 'Dino-Roar: Shuffle a Magic Beanstalk into your deck'?", answer: "Lima-Pleurodon", wrong: ["Navy Bean", "Admiral Navy Bean", "Tricarrotops"] },
    { question: "What does the Plant superpower 'Transmogrify' do?", answer: "Transforms a Zombie into a random 1-cost Zombie", wrong: ["Transforms a Zombie into a 1/1 Goat", "Destroys a Zombie with 3 or less Attack", "Bounces a Zombie"] },
    { question: "What is the only card in the entire game that has an Armor value higher than 'Armored 1'?", answer: "Knight of the Living Dead", wrong: ["Undying Pharaoh", "Rodeo Gargantuar", "Juggernut"] },
    { question: "Which Plant card is completely unable to attack the Zombie in its own lane?", answer: "Rotobaga", wrong: ["Threepeater", "Snapdragon", "Shooting Starfruit"] },
    { question: "Astro Vera is unique because it is the only card in the game that can do what?", answer: "Increase a Hero's maximum health", wrong: ["Heal a Hero to full health", "Prevent a Hero from taking damage", "Give a Hero an extra Super-Block"] },
    { question: "Which Plant card is the only one in the game that can reduce the cost of cards in your hand?", answer: "Captain Cucumber", wrong: ["Party Thyme", "Savage Spinach", "Onion Rings"] },
    { question: "Which Zombie is the only one in the game to possess exactly one trait from all five Zombie classes?", answer: "Kitchen Sink Zombie", wrong: ["Zombot Dinotronic Mechasaur", "Gargantuar Mime", "Frankentuar"] },
    { question: "Which Plant legendary does NOT have the Amphibious trait, despite physically floating above the ground?", answer: "Shooting Starfruit", wrong: ["Winter Melon", "Dark Matter Dragonfruit", "Cornucopia"] },
    { question: "Which Plant has the highest base Health stat in the entire game?", answer: "Soul Patch", wrong: ["Primal Wall-Nut", "Water Chestnut", "Gravitree"] },
    { question: "What happens when you use the trick 'Evolutionary Leap' on any 8-Cost Zombie?", answer: "You are guaranteed to get a Zombot 1000", wrong: ["You get a random 9-cost Zombie", "You get an Octo Zombie", "The card does nothing and is wasted"] },
    { question: "'Ensign Uproot' is completely unique because it is the only card in the entire game that can do what?", answer: "Move both Plants and Zombies", wrong: ["Bounce both Plants and Zombies", "Heal both Plants and Zombies", "Freeze both Plants and Zombies"] },

    // --- TRIBES & SYNERGIES ---
    { question: "Which of the following is the only 'Pinecone Animal' in the game?", answer: "Pineclone", wrong: ["Sap-Fling", "Grizzly Pear", "Hibernating Beary"] },
    { question: "Which Zombie tribe has direct synergy with the 'Zookeeper' card?", answer: "Pet", wrong: ["Monster", "Professional", "Science"] },
    { question: "What tribe does the 'Cornucopia' card belong to?", answer: "Corn", wrong: ["Fruit", "Seed", "Squash"] },
    { question: "Which of the following is NOT a real Plant tribe in the game?", answer: "Vine", wrong: ["Root", "Pinecone", "Banana"] },
    { question: "Which Plant card belongs to the 'Squash' tribe and destroys a Zombie unconditionally?", answer: "Squash", wrong: ["Lawnmower", "Whack-a-Zombie", "Shamrocket"] },
    { question: "What is the tribe of the 0-cost Zombie 'Swabbie'?", answer: "Pirate Imp", wrong: ["Monster Imp", "Pet Imp", "Professional Imp"] },
    { question: "What is the only tribe that features cards on both the Plant and Zombie sides?", answer: "Mime", wrong: ["Monster", "Pet", "Gourmet"] },
    { question: "Which primal plant is NOT in the same class as its modern counterpart?", answer: "Primal Peashooter", wrong: ["Primal Sunflower", "Primal Wall-Nut", "Primal Potato Mine"] },
    { question: "Which tribe is unique because its main synergy card only buffs cards currently in your hand?", answer: "Banana", wrong: ["Pea", "Mushroom", "Berry"] },
    { question: "Which Zombie was the one and only member of the 'Clock' tribe?", answer: "Cuckoo Zombie", wrong: ["Synchronized Swimmer", "Portal Technician", "Kitchen Sink Zombie"] },

    // --- ENVIRONMENTS ---
    { question: "What is the exact effect of the Plant environment 'Pair Pearadise'?", answer: "Makes a copy of a Plant played there", wrong: ["Gives Plants Team-Up", "Heals Plants for 4", "Gives Plants +2/+2"] },
    { question: "Which Zombie environment makes Plants played there get -1/-0?", answer: "Black Hole", wrong: ["Trapper Territory", "Cone Zone", "Meteor Z"] },
    { question: "Which environment is entirely transparent, allowing the background stage lights to be seen flashing through it?", answer: "Sappy Place", wrong: ["Force Field", "Black Hole", "Laser Base Alpha"] },
    { question: "Which Plant environment gives attacking Plants the 'Double Strike' trait?", answer: "Coffee Grounds", wrong: ["Planet of the Grapes", "Mushroom Grotto", "Pair Pearadise"] },
    { question: "Which card has the Zombie Evolution ability: 'A Zombie played on this does a Bonus Attack'?", answer: "Mustache Monument", wrong: ["Moon Base Z", "Area 22", "Teleportation Zombie"] },

    // --- HEROES & CLASSES ---
    { question: "Which Zombie Hero was NOT part of the original base game and was added in a later update?", answer: "Huge-Gigantacus", wrong: ["Brain Freeze", "Neptuna", "Professor Brainstorm"] },
    { question: "Which Plant Hero is technically a time-traveling orange from the future?", answer: "Citron", wrong: ["Captain Combustible", "Grass Knuckles", "Beta-Carrotina"] },
    { question: "Which Plant Hero is entirely based on a burning tree stump?", answer: "Captain Combustible", wrong: ["Grass Knuckles", "Spudow", "Citron"] },
    { question: "Which two Plant Heroes share the exact same class combination of Guardian and Smarty?", answer: "Citron & Beta-Carrotina", wrong: ["Green Shadow & Rose", "Wall-Knight & Spudow", "Nightcap & Captain Combustible"] },
    { question: "What are the two classes commanded by the Zombie Hero 'Rustbolt'?", answer: "Brainy and Hearty", wrong: ["Brainy and Crazy", "Hearty and Sneaky", "Crazy and Beastly"] },
    { question: "The 'Beastly' and 'Hearty' classes belong to which Zombie Hero?", answer: "The Smash", wrong: ["Rustbolt", "Brain Freeze", "Immorticia"] },
    { question: "Which Plant Hero leads the Mega-Grow and Smarty classes?", answer: "Green Shadow", wrong: ["Solar Flare", "Wall-Knight", "Nightcap"] },
    { question: "Who is the Zombie Hero that commands the Sneaky and Crazy classes?", answer: "Impfinity", wrong: ["Super Brainz", "Electric Boogaloo", "Professor Brainstorm"] },
    { question: "Which Hero's signature superpower is considered a 'Gargantuar' Trick, meaning Gargologist reduces its cost?", answer: "The Smash", wrong: ["Z-Mech", "Brain Freeze", "Immorticia"] },
    { question: "Huge-Gigantacus and Beta-Carrotina are completely unique among all heroes for what reason?", answer: "Their superpowers consist of environments and fighters, not tricks", wrong: ["They command three classes instead of two", "They start the game with two Superpowers", "They have 25 maximum health"] },
    { question: "Which is the only Hero in the game with absolutely no 'Destroy' (Instant Kill) cards in their classes?", answer: "Captain Combustible", wrong: ["Spudow", "Solar Flare", "Green Shadow"] },
    { question: "Which of these Plant classes has absolutely no cards with the Amphibious trait?", answer: "Kabloom", wrong: ["Guardian", "Smarty", "Mega-Grow"] },

    // --- HERO SIGNATURE SUPERPOWERS ---
    { question: "What is the name of Wall-Knight's Signature Superpower?", answer: "Uncrackable", wrong: ["Nut Signal", "Bubble Up", "Geyser"] },
    { question: "Which Zombie Hero's Signature Superpower is called 'Terror-Former 10,000'?", answer: "Huge-Gigantacus", wrong: ["Rustbolt", "Professor Brainstorm", "Z-Mech"] },
    { question: "What is the name of Impfinity's Signature Superpower?", answer: "Triple Threat", wrong: ["Clone Army", "Imp Swarm", "Deadly Dance"] },

    // --- BASIC RULES & UI ---
    { question: "What is the maximum number of copies of a single card you can have in a standard ranked deck?", answer: "4", wrong: ["3", "5", "2"] },
    { question: "Which of these is NOT one of the 5 Zombie classes?", answer: "Brutal", wrong: ["Hearty", "Sneaky", "Brainy"] },
    { question: "What does playing the 'Teleport' trick allow a Zombie player to do?", answer: "Play a Zombie during the Trick phase", wrong: ["Move a Zombie to another lane", "Bounce a Plant", "Draw 3 cards"] },
    { question: "What happens when you tap and swipe down repeatedly on the main Collection screen?", answer: "A hidden Wall-Nut peeks upside down from the top of the screen", wrong: ["A secret Zombie hand grabs a card", "The screen flashes green", "You get a free Spark"] },
    { question: "The 10x and 5x multiplier symbols on strategy decks disappear from the menu under what condition?", answer: "Once you collect all 4 event cards for that week", wrong: ["When you reach Ultimate League", "When you buy the deck with gems", "At the end of the Season"] },

    // --- INTERNAL DATA & REMOVED CONTENT ---
    { question: "What was the development code name for the 'Solar Winds' environment before the game was officially released?", answer: "Zen Garden", wrong: ["Sun Realm", "Light Ray", "Golden Ground"] },
    { question: "In the game's internal code and files, which Hero is named 'scortchwood'?", answer: "Captain Combustible", wrong: ["Torchwood", "Solar Flare", "Nightcap"] },
    { question: "In the game's internal files, which Hero is named 'penelopea'?", answer: "Green Shadow", wrong: ["Peashooter", "Grass Knuckles", "Rose"] },
    { question: "Which tribe was completely removed from the game, which originally contained 'Surfer Zombie'?", answer: "Vacation", wrong: ["Beach", "Water", "Sports"] },
    { question: "Which tribe was completely removed from the game, which originally contained 'Trash Can Zombie' and 'Stealthy Imp'?", answer: "Garbage", wrong: ["Junk", "Dumpster", "Alley"] },
    { question: "Which card's strategy deck used to be called 'Pearadise Found'?", answer: "Spudow (Double Trouble)", wrong: ["Citron (Nut-tastic)", "Wall-Knight (Heal-Lusion)", "Captain Combustible (Moss Boss)"] }
];

let triviaScore = 0;
let triviaBestScore = parseInt(localStorage.getItem('triviaBestScore') || '0');
let currentQuestionObj = null;
let triviaIsAnimating = false;
let triviaIsGameOver = false;

const triviaGameArea = document.getElementById('triviaGameArea');
const triviaQuestionEl = document.getElementById('triviaQuestion');
const triviaOptionsContainer = document.getElementById('triviaOptions');
const triviaGameOverEl = document.getElementById('triviaGameOver');
const triviaScoreEl = document.getElementById('triviaScore');
const triviaBestEl = document.getElementById('triviaBest');

// Set initial best score display
triviaBestEl.textContent = triviaBestScore;

// Helper: Shuffle an array (Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function loadTriviaQuestion() {
    triviaOptionsContainer.innerHTML = '';
    
    // Pick a new random question (and prevent getting the exact same one twice in a row)
    let newQuestion;
    do {
        newQuestion = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
    } while (newQuestion === currentQuestionObj && triviaQuestions.length > 1);
    currentQuestionObj = newQuestion;
    
    triviaQuestionEl.textContent = currentQuestionObj.question;

    let options = [currentQuestionObj.answer, ...currentQuestionObj.wrong];
    options = shuffleArray(options);

    options.forEach(optionText => {
        const btn = document.createElement('button');
        btn.className = 'trivia-btn';
        btn.textContent = optionText;
        btn.onclick = () => handleTriviaGuess(optionText, btn);
        triviaOptionsContainer.appendChild(btn);
    });
}

function handleTriviaGuess(selectedOption, clickedBtn) {
    if (triviaIsAnimating || triviaIsGameOver) return;
    triviaIsAnimating = true;

    const allBtns = triviaOptionsContainer.querySelectorAll('.trivia-btn');
    
    if (selectedOption === currentQuestionObj.answer) {
        // --- CORRECT ---
        clickedBtn.classList.add('trivia-correct');
        triviaScore++;
        triviaScoreEl.textContent = triviaScore;

        // High Score Logic
        if (triviaScore > triviaBestScore) {
            triviaBestScore = triviaScore;
            triviaBestEl.textContent = triviaBestScore;
            localStorage.setItem('triviaBestScore', triviaBestScore.toString());
        }

        // Wait 1.2s, fade out, load new question, fade in
        setTimeout(() => {
            triviaGameArea.classList.add('trivia-fade-out');
            
            setTimeout(() => {
                loadTriviaQuestion();
                triviaGameArea.classList.remove('trivia-fade-out');
                
                setTimeout(() => { triviaIsAnimating = false; }, 300); // Unlock after fade-in
            }, 300); 
            
        }, 1200);

    } else {
        // --- WRONG ---
        triviaIsGameOver = true;
        clickedBtn.classList.add('trivia-wrong');
        
        // Disable everything and highlight the correct answer so they learn from it
        allBtns.forEach(btn => {
            btn.disabled = true;
            if (btn.textContent === currentQuestionObj.answer) {
                btn.classList.add('trivia-correct');
            } else if (btn !== clickedBtn) {
                btn.style.opacity = '0.4'; // Fade out other wrong answers
            }
        });

        // Show Game Over menu after 1.5 seconds
        setTimeout(() => {
            triviaGameOverEl.style.display = 'block';
        }, 1500);
    }
}

function startTrivia() {
    triviaIsGameOver = false;
    triviaIsAnimating = false;
    triviaScore = 0;
    
    triviaScoreEl.textContent = triviaScore;
    triviaGameOverEl.style.display = 'none';
    triviaGameArea.classList.remove('trivia-fade-out');
    
    loadTriviaQuestion();
}

// Event Listeners
document.getElementById('triviaRestartBtn').addEventListener('click', startTrivia);

// Initialize
startTrivia();

// ==========================================
// DAILY REDACTED LOGIC
// ==========================================

// 1. Setup the Daily Seed
const rToday = new Date();
const rDateString = `${rToday.getFullYear()}-${rToday.getMonth()}-${rToday.getDate()}`;
const rDateSum = rToday.getFullYear() + rToday.getMonth() + rToday.getDate();

// Filter to only include cards that actually have a description
const validRedactedKeys = Object.keys(cardDatabase).filter(key => 
    cardDatabase[key].Description && cardDatabase[key].Description.trim().length > 0
).sort();

// Offset by 42 so it's not the same card as Daily Silhouette
const redactedDailyKey = validRedactedKeys[(rDateSum + 42) % validRedactedKeys.length]; 
const redactedDailyCard = cardDatabase[redactedDailyKey];

// 2. Grab DOM Elements
const redactedDescEl = document.getElementById('redactedDescriptionText');
const redactedInputArea = document.getElementById('redactedInputArea');
const redactedGuessInput = document.getElementById('redactedGuess');
const redactedSubmitBtn = document.getElementById('redactedSubmitBtn');
const redactedFeedbackEl = document.getElementById('redactedFeedback');
const redactedAttemptsEl = document.getElementById('redactedAttempts');
const redactedSuggestionsBox = document.getElementById('redactedSuggestions');

// 3. State Management variables
const rSavedDate = localStorage.getItem('redactedDate');
const rIsSolved = localStorage.getItem('redactedSolved') === 'true';
let rWrongGuesses = parseInt(localStorage.getItem('redactedGuesses') || '0');
const MAX_ATTEMPTS = 5;

if (rSavedDate !== rDateString) {
    localStorage.setItem('redactedDate', rDateString);
    localStorage.setItem('redactedSolved', 'false');
    localStorage.setItem('redactedGuesses', '0');
    rWrongGuesses = 0;
    setupRedactedUnsolvedState();
} else if (rIsSolved) {
    setupRedactedSolvedState();
} else if (rWrongGuesses >= MAX_ATTEMPTS) {
    setupRedactedGameOverState();
} else {
    setupRedactedUnsolvedState();
}

// --- State Helper Functions ---
function setupRedactedUnsolvedState() {
    redactedInputArea.style.display = 'block';
    redactedFeedbackEl.textContent = '';
    updateRedactedDisplay();
}

function setupRedactedSolvedState() {
    redactedInputArea.style.display = 'none';
    redactedFeedbackEl.textContent = `You got it! It was ${redactedDailyCard.Name.replace(/_/g, ' ')}!`;
    redactedFeedbackEl.style.color = '#4CAF50';
    rWrongGuesses = parseInt(localStorage.getItem('redactedGuesses') || '0');
    updateRedactedDisplay(true); 
}

function setupRedactedGameOverState() {
    redactedInputArea.style.display = 'none';
    redactedFeedbackEl.textContent = `Game Over! The card was ${redactedDailyCard.Name.replace(/_/g, ' ')}.`;
    redactedFeedbackEl.style.color = '#f44336';
    updateRedactedDisplay(true); 
}

// --- Progressive Redaction Logic ---
function generateRedactedText(text, attempts, forceReveal = false) {
    if (forceReveal) return text;

    const parts = text.split(/(\s+)/);
    let targetWords = [];

    // Stop words that are never redacted
    const stopWords = ['a', 'an', 'the', 'and', 'or', 'to', 'in', 'on', 'of', 'for', 'with', 'is', 'it', 'all', 'this'];

    parts.forEach((part, index) => {
        if (part.trim().length > 0) {
            const cleanWord = part.replace(/[^a-zA-Z]/g, '').toLowerCase();
            if (cleanWord.length > 0 && !stopWords.includes(cleanWord)) {
                targetWords.push(index);
            }
        }
    });

    // Reveal scaling: 0 = 0%, 1 = 25%, 2 = 50%, 3 = 75%, 4 = 90%
    let percentToReveal = 0;
    if (attempts === 1) percentToReveal = 0.25;
    else if (attempts === 2) percentToReveal = 0.50;
    else if (attempts === 3) percentToReveal = 0.75;
    else if (attempts >= 4) percentToReveal = 0.90;

    let revealCount = Math.floor(targetWords.length * percentToReveal);
    
    let revealIndices = new Set();
    if (revealCount > 0) {
        let step = targetWords.length / revealCount;
        for (let i = 0; i < revealCount; i++) {
            revealIndices.add(targetWords[Math.floor(i * step)]);
        }
    }

    return parts.map((part, index) => {
        if (targetWords.includes(index) && !revealIndices.has(index)) {
            return part.replace(/[a-zA-Z0-9]/g, '█');
        }
        return part;
    }).join('');
}

function updateRedactedDisplay(forceReveal = false) {
    redactedAttemptsEl.textContent = rWrongGuesses;
    redactedDescEl.textContent = generateRedactedText(redactedDailyCard.Description, rWrongGuesses, forceReveal);
}

// --- Autocomplete Logic ---
let rSelectedRawName = null;

redactedGuessInput.addEventListener('input', function() {
    const query = this.value.toLowerCase().trim();
    redactedSuggestionsBox.innerHTML = ''; 
    rSelectedRawName = null; 

    if (query.length < 2) {
        redactedSuggestionsBox.style.display = 'none';
        return;
    }

    let matches = 0;
    Object.keys(cardDatabase).forEach(rawName => {
        if (matches >= 2) return; // Kept strictly to 2 max
        
        const cleanName = rawName.replace(/_/g, ' ');
        if (cleanName.toLowerCase().includes(query)) {
            const cardInfo = cardDatabase[rawName];
            
            const li = document.createElement('li');
            // Exact same innerHTML and classes as Silhouette
            li.innerHTML = `<span>${cleanName}</span> <span class="suggestion-class">${cardInfo.Class}</span>`;
            
            li.onclick = () => {
                redactedGuessInput.value = cleanName;
                rSelectedRawName = rawName; 
                redactedSuggestionsBox.style.display = 'none';
                newRedactedSubmitBtn.click(); 
            };
            
            redactedSuggestionsBox.appendChild(li);
            matches++;
        }
    });

    redactedSuggestionsBox.style.display = matches > 0 ? 'block' : 'none';
});

// Hide suggestions if clicking outside
document.addEventListener('click', (e) => {
    if (e.target !== redactedGuessInput) redactedSuggestionsBox.style.display = 'none';
});

// --- Handle the Guess ---
const newRedactedSubmitBtn = redactedSubmitBtn.cloneNode(true);
redactedSubmitBtn.parentNode.replaceChild(newRedactedSubmitBtn, redactedSubmitBtn);

newRedactedSubmitBtn.addEventListener('click', () => {
    if (rWrongGuesses >= MAX_ATTEMPTS || rIsSolved) return;

    const actualNameKey = redactedDailyKey.toLowerCase();
    let guessKeyToTest = rSelectedRawName ? rSelectedRawName.toLowerCase() : redactedGuessInput.value.trim().toLowerCase().replace(/\s+/g, '_');

    if (guessKeyToTest === actualNameKey) {
        // Correct Guess!
        localStorage.setItem('redactedSolved', 'true');
        setupRedactedSolvedState();
    } else {
        // Wrong Guess!
        rWrongGuesses++;
        localStorage.setItem('redactedGuesses', rWrongGuesses.toString());
        
        if (rWrongGuesses >= MAX_ATTEMPTS) {
            setupRedactedGameOverState();
        } else {
            redactedFeedbackEl.textContent = "Incorrect. More of the description has been revealed!";
            redactedFeedbackEl.style.color = '#f44336';
            
            updateRedactedDisplay(); 
            redactedGuessInput.value = '';
            redactedGuessInput.focus();
        }
    }
});
}