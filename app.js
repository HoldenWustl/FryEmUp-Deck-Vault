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
const synergyBtn = document.getElementById('synergyBtn');
const synergyView = document.getElementById('synergyView');

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
    renderSeeds(); // Initial render to show empty state
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
    gamesView.classList.add('hidden');
    searchWrapper.classList.add('hidden');
    statsBtn.classList.add('hidden');
    crafterBtn.classList.add('hidden');
    gamesBtn.classList.add('hidden'); 
    synergyView.classList.add('hidden');
    synergyBtn.classList.add('hidden');
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

    } 
    else if (hash === '#synergy') { // <-- NEW ROUTE
        synergyView.classList.remove('hidden');
        if (typeof backBtn !== 'undefined') backBtn.classList.remove('hidden');
        // We will define this function next!
        if (typeof renderSynergyWeb === 'function') renderSynergyWeb();

    }
    else {
        // Default Home UI
        deckView.classList.remove('hidden');
        searchWrapper.classList.remove('hidden');
        statsBtn.classList.remove('hidden');
        crafterBtn.classList.remove('hidden');
        gamesBtn.classList.remove('hidden');
        synergyBtn.classList.remove('hidden');
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
    deckGrid.classList.add('hidden'); 
    if (statsBtn) statsBtn.disabled = true;
    if (crafterBtn) crafterBtn.disabled = true;
    if (gamesBtn) gamesBtn.disabled = true;
    if (synergyBtn) synergyBtn.disabled = true;

    setTimeout(() => {
        deckGrid.innerHTML = '';
        
        const fragment = document.createDocumentFragment();

        for (const [deckKey, deckInfo] of Object.entries(data)) {
            const cardEl = document.createElement('div');
            
            // --- UPDATED: FACTION CHECK LOOP ---
            let factionClass = 'plant-deck'; // Fallback default
            
            if (deckInfo.cards && deckInfo.cards.length > 0) {
                // Loop through cards until we find one that is definitively Plant or Zombie
                for (const cardRaw of deckInfo.cards) {
                    // Strip the "x4", "4x", "1x", etc., and any bullet points
                    let parsedCardName = cardRaw.replace(/^[^a-zA-Z]*(x?\d+|\d+x)\s*/i, '').trim();
                    
                    // Format for lookup 
                    const nameWithSpaces = parsedCardName.replace(/_/g, ' ');
                    const nameWithUnderscores = parsedCardName.replace(/ /g, '_');
                    
                    // Try to find the card in the DB
                    const cardData = cardDatabase[nameWithUnderscores] || cardDatabase[nameWithSpaces];
                    
                    if (cardData && (cardData.Type || cardData.type)) {
                        const typeString = (cardData.Type || cardData.type).toLowerCase();
                        
                        // Check for definitive faction keyword
                        if (typeString.includes('zombie')) {
                            factionClass = 'zombie-deck';
                            break; // We found the faction, stop checking this deck's cards
                        } else if (typeString.includes('plant')) {
                            factionClass = 'plant-deck';
                            break; // We found the faction, stop checking this deck's cards
                        }
                    }
                }
            }
            
            // Apply the base class AND the newly calculated faction class
            cardEl.className = `deck-card ${factionClass}`;
            // -----------------------------------

            let cardsHtml = '<ul class="card-list">';
            deckInfo.cards.forEach(card => {
                const cleanCardName = card.replace(/_/g, ' ');
                cardsHtml += `<li>${cleanCardName}</li>`;
            });
            cardsHtml += '</ul>';

           const dateStr = deckInfo.upload_date && deckInfo.upload_date !== "UNKNOWN_DATE"
    ? deckInfo.upload_date
    : "Unknown Date";

const creditStr = deckInfo.credit || "Unknown";

const videoId = getYouTubeId(deckInfo.youtube_url);
const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : '';

const creditIconSrc = creditStr === "FryEmUp" ? "fryemup.jpg" : "discord.webp";

// 1. Determine if we should show the video section
const isFryVideo = creditStr === "FryEmUp" && deckInfo.youtube_url;

// 2. Build the Video Dropdown HTML (only if it's Fry)
const videoControlsHtml = isFryVideo ? `
    <details class="video-dropdown" 
             ontoggle="this.closest('.deck-card').querySelector('.video-preview').classList.toggle('hidden', !this.open)">
        <summary>View Video</summary>
    </details>` : '';

// 3. Build the Video Preview HTML (only if it's Fry)
const videoPreviewHtml = isFryVideo ? `
    <div class="video-preview hidden">
        <a href="${deckInfo.youtube_url}" target="_blank" title="${deckInfo.youtube_title}">
            <img src="${thumbnailUrl}" alt="Video Thumbnail" loading="lazy">
            <div class="video-title-overlay">${deckInfo.youtube_title}</div>
        </a>
    </div>` : '';

cardEl.innerHTML = `
    <div class="deck-card-inner">
        <div class="deck-header">
            <div class="deck-title-group">
                <h3 class="deck-title">${deckInfo.name}</h3>
                <span class="deck-credit" title="${creditStr}">${creditStr}</span>
            </div>
            <span class="deck-date">${dateStr}</span>
        </div>
       
        <div class="deck-controls-wrapper">
            ${videoControlsHtml}
            
            <details class="visual-deck-details">
                <summary class="view-visual-btn" 
                         data-title="${deckInfo.name}" 
                         data-cards="${encodeURIComponent(JSON.stringify(deckInfo.cards))}">
                    View Visual Deck
                </summary>
            </details>
        </div>

        ${videoPreviewHtml}
        ${cardsHtml}

        <img class="credit-icon" src="${creditIconSrc}" alt="${creditStr} icon">
    </div>
`;
            
            fragment.appendChild(cardEl);
        }

        deckGrid.appendChild(fragment);

        if (loadingIndicator) loadingIndicator.classList.add('hidden');
        deckGrid.classList.remove('hidden');
        if (statsBtn) statsBtn.disabled = false;
        if (crafterBtn) crafterBtn.disabled = false;
        if (gamesBtn) gamesBtn.disabled = false;
        if (synergyBtn) synergyBtn.disabled = false;

    }, 50); 
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
    gamesBtn.classList.remove('hidden'); // Restore the games button
    synergyBtn.classList.remove('hidden'); // Restore the synergy button

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

       function setExtremeCard({
    linkId,
    imgId,
    nameId,
    costId,
    deck,
    costText,
    youtubeId
}) {
    const linkEl = document.getElementById(linkId);
    const imgEl = document.getElementById(imgId);
    const nameEl = document.getElementById(nameId);
    const costEl = document.getElementById(costId);

    if (!linkEl || !imgEl || !nameEl || !costEl) return;

    nameEl.innerText = deck.name || deck.youtube_title || '-';
    costEl.innerText = costText;

    if (youtubeId) {
        imgEl.src = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
    } else {
        imgEl.removeAttribute('src');
    }

    imgEl.alt = `${deck.name || deck.youtube_title || 'Deck'} thumbnail`;
    linkEl.href = deck.youtube_url || "#";
}
if (document.getElementById('mostP2wDeck') && mostExpensiveDeck && leastExpensiveDeck) {
    const mostId = getYouTubeId(mostExpensiveDeck.youtube_url);
    const leastId = getYouTubeId(leastExpensiveDeck.youtube_url);

    setExtremeCard({
        linkId: 'mostP2wLink',
        imgId: 'mostP2wImg',
        nameId: 'mostP2wDeck',
        costId: 'mostP2wCost',
        deck: mostExpensiveDeck,
        costText: maxSparkCost.toLocaleString() + ' Sparks',
        youtubeId: mostId
    });

    setExtremeCard({
        linkId: 'leastP2wLink',
        imgId: 'leastP2wImg',
        nameId: 'leastP2wDeck',
        costId: 'leastP2wCost',
        deck: leastExpensiveDeck,
        costText: minSparkCost.toLocaleString() + ' Sparks',
        youtubeId: leastId
    });

    if (heaviestDeck && lightestDeck) {
        const heaviestId = getYouTubeId(heaviestDeck.youtube_url);
        const lightestId = getYouTubeId(lightestDeck.youtube_url);

        setExtremeCard({
            linkId: 'heaviestLink',
            imgId: 'heaviestImg',
            nameId: 'heaviestDeck',
            costId: 'heaviestCost',
            deck: heaviestDeck,
            costText: maxAvgCost.toFixed(2) + ' Avg Cost',
            youtubeId: heaviestId
        });

        setExtremeCard({
            linkId: 'lightestLink',
            imgId: 'lightestImg',
            nameId: 'lightestDeck',
            costId: 'lightestCost',
            deck: lightestDeck,
            costText: minAvgCost.toFixed(2) + ' Avg Cost',
            youtubeId: lightestId
        });
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
       // --- 1. SET UP THE PAST BASELINE ---
const dropCount = Math.min(100, Math.floor(totalDecks * 0.5)); 
const safeDropCount = Math.max(1, dropCount); 
const pastDecks = allDecks.slice(safeDropCount);

// --- 2. DYNAMIC RANKING FUNCTIONS ---
// Helper function to extract a sorted array of card names, WITH filtering logic included
function getRankedCards(deckArray, filterValue = 'all') {
    const counts = {};
    
    deckArray.forEach(deck => {
        deck.cards.forEach(cardString => {
            const match = cardString.match(/^x(\d+)\s+(.+)$/);
            
            if (match) {
                const count = parseInt(match[1], 10);
                const cardName = match[2].replace(/_/g, ' '); 
                
                // --- Apply the filter check ---
                let keep = true;
                if (filterValue !== 'all') {
                    const dbKey = cardName.replace(/ /g, '_');
                    const info = cardDatabase[dbKey] || {}; 
                    
                    const typeStr = info.Type ? info.Type.toLowerCase() : "";
                    const isTrick = typeStr.includes("trick");
                    const isEnv = typeStr.includes("environment");
                    const isMinion = info.Type && !isTrick && !isEnv;
                    const cost = parseInt(info.Cost, 10) || 0;

                    keep = false;
                    if (filterValue === "minion" && isMinion) keep = true;
                    else if (filterValue === "trick" && isTrick) keep = true;
                    else if (filterValue === "environment" && isEnv) keep = true;
                    else if (filterValue === "wincon" && cost >= 5) keep = true;
                }

                if (keep) {
                    counts[cardName] = (counts[cardName] || 0) + count;
                }
            }
        });
    });
    
    // Sort by total copies (highest first) and return just an array of the names
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]); 
}

// Function to generate the dictionary of text arrows based on a specific category
function generateRankChanges(filterValue) {
    const currentList = getRankedCards(allDecks, filterValue);
    const pastList = getRankedCards(pastDecks, filterValue);
    
    const changes = {};
    currentList.forEach((card, currentIndex) => {
        const pastIndex = pastList.indexOf(card);
        
        if (pastIndex === -1) {
            changes[card] = '  (NEW)'; 
        } else {
            const change = pastIndex - currentIndex; 
            if (change > 0) changes[card] = `  (+${change} ▲)`; 
            else if (change < 0) changes[card] = `  (-${Math.abs(change)} ▼)`; 
            else changes[card] = `  (--)`; 
        }
    });
    return changes;
}

// Initialize the global rankings for the default 'all' view when page loads
let currentRankChanges = generateRankChanges('all');


// --- 3. CHART 1: Total Copies ---
const ctx1 = document.getElementById('topCardsChart').getContext('2d');
charts.topCards = new Chart(ctx1, {
    type: 'bar',
    data: {
        // Use currentRankChanges to map the initial labels
        labels: topCopiedSliced.map(i => `${i[0]}${currentRankChanges[i[0]] || ''}`),
        datasets: [{ label: 'Total Copies', data: topCopiedSliced.map(i => i[1]), backgroundColor: '#238636', borderRadius: 4, hoverBackgroundColor: '#2ea043' }]
    },
    options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        scales: { x: { grid: { color: gridColor }, ticks: { color: textColor } }, y: { ticks: { color: '#c9d1d9' }, grid: { display: false } } },
        plugins: { legend: { display: false }, tooltip: { callbacks: { footer: () => '👉 Click to search for this card' } } },
        onClick: (e, activeElements) => {
            if (activeElements.length > 0) {
                const clickedCard = charts.topCards.data.labels[activeElements[0].index];
                
                window.location.hash = '#'; 

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        const searchInput = document.getElementById('searchInput');
                        if (searchInput) {
                            const cleanCardName = clickedCard.split(/  \(/)[0];
                            searchInput.value = cleanCardName;
                            searchInput.dispatchEvent(new Event('input'));
                        }
                    });
                });
            }
        },
        onHover: (e, activeElements) => { e.native.target.style.cursor = activeElements.length ? 'pointer' : 'default'; }
    }
});


// --- 4. TOP CARDS FILTER LOGIC ---
window.applyTopCardsFilter = function (filterValue) {
    if (!charts.topCards) return; 

    let filteredArray = [];

    Object.entries(cardCopies).forEach(([cardName, count]) => {
        if (count === 0) return;

        const dbKey = cardName.replace(/ /g, '_');
        const info = cardDatabase[dbKey] || {}; 
        
        const typeStr = info.Type ? info.Type.toLowerCase() : "";
        const isTrick = typeStr.includes("trick");
        const isEnv = typeStr.includes("environment");
        const isMinion = info.Type && !isTrick && !isEnv;
        const cost = parseInt(info.Cost, 10) || 0;

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

    // --- THE FIX: Recalculate rank changes for this specific category ---
    currentRankChanges = generateRankChanges(filterValue);

    charts.topCards.data.labels = newTopSliced.map(i => {
        const cleanName = i[0]; 
        // Use the freshly generated context-aware arrows
        return `${cleanName}${currentRankChanges[cleanName] || ''}`;
    });
    
    charts.topCards.data.datasets[0].data = newTopSliced.map(i => i[1]);

    // Update Colors based on filter
    let newColor = '#238636';       
    let hoverColor = '#2ea043';

    if (filterValue === 'trick') { newColor = '#8957e5'; hoverColor = '#a371f7'; } 
    else if (filterValue === 'environment') { newColor = '#58a6ff'; hoverColor = '#79c0ff'; } 
    else if (filterValue === 'wincon') { newColor = '#f85149'; hoverColor = '#ff7b72'; } 

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
const heroMap = {
    // Plants
    "Mega-Grow,Smarty": "Green Shadow",
    "Kabloom,Solar": "Solar Flare",
    "Guardian,Solar": "Wall-Knight",
    "Mega-Grow,Solar": "Chompzilla",
    "Guardian,Kabloom": "Spudow",
    "Guardian,Smarty": "Citron / Beta-Carrotina", 
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
let heroAnnounced = false;
let currentFaction = null;
let activeClasses = new Set(); 
let currentClipboardText = "";
let lastAddedCard = null; // Memory for AI context

// UI Elements
const seedInput = document.getElementById('seedSearchInput');
const suggestionsBox = document.getElementById('smartSuggestions');
const generateDeckBtn = document.getElementById('generateDeckBtn');
const clearSeedsBtn = document.getElementById('clearSeedsBtn');
const budgetToggle = document.getElementById('budgetToggle');
const superBudgetToggle = document.getElementById('superBudgetToggle');

// Toggles Logic
if (budgetToggle && superBudgetToggle) {
    budgetToggle.addEventListener('change', function() {
        if (this.checked) superBudgetToggle.checked = false;
    });
    superBudgetToggle.addEventListener('change', function() {
        if (this.checked) budgetToggle.checked = false;
    });
}

const getTotalCards = () => currentSeeds.reduce((sum, seed) => sum + seed.count, 0);


// --- 1. Smart Autocomplete ---
seedInput.addEventListener('input', function() {
    const query = this.value.toLowerCase().trim();
    suggestionsBox.innerHTML = ''; 

    if (getTotalCards() >= 40) {
        suggestionsBox.innerHTML = '<li style="color: #ff7b72; justify-content: center;">Deck is full! (40 cards)</li>';
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
            
            const existing = currentSeeds.find(s => s.name === rawName);
            if (existing && existing.count >= 4) return;

            const li = document.createElement('li');
            li.innerHTML = `<span>${cleanName}</span> <span class="suggestion-class">${cardClass}</span>`;
            // Add via autocomplete defaults to 4 copies
            li.onclick = () => addSeed(rawName, cardClass, cardFaction, 4);
            suggestionsBox.appendChild(li);
            matches++;
        }
    });

    suggestionsBox.style.display = matches > 0 ? 'block' : 'none';
});

document.addEventListener('click', (e) => {
    if (e.target !== seedInput && e.target !== suggestionsBox) {
        suggestionsBox.style.display = 'none';
    }
});

function addSeed(rawName, cardClass, cardFaction, requestedAmount = 4) {
    const spaceLeft = 40 - getTotalCards();
    if (spaceLeft <= 0) return;

    const existing = currentSeeds.find(s => s.name === rawName);
    const currentCount = existing ? existing.count : 0;
    const roomForThisCard = 4 - currentCount;
    
    // Automatically calculate how many we can actually add
    let amountToAdd = Math.min(requestedAmount, spaceLeft, roomForThisCard);
    if (amountToAdd <= 0) return; 

    if (existing) {
        existing.count += amountToAdd;
    } else {
        currentSeeds.push({ 
            name: rawName, 
            count: amountToAdd, 
            class: cardClass, 
            faction: cardFaction,
            cost: cardDatabase[rawName].Cost 
        });
    }

    lastAddedCard = rawName; // Update AI memory
    currentFaction = cardFaction;
    activeClasses.add(cardClass);

    seedInput.value = '';
    suggestionsBox.style.display = 'none';
    renderSeeds();
}

// --- 2. Unified Visual Rendering ---
function renderSeeds() {
    const resultsContainer = document.getElementById('generatedDeckList'); 
    const tracker = document.getElementById('cardCountTracker'); 
    const title = document.getElementById('generatedDeckTitle');
    const actionContainer = document.getElementById('deckActionContainer'); 
    const totalCards = getTotalCards();

    // NEW: Always dynamically reconstruct the active classes to prevent de-sync bugs!
    activeClasses.clear();
    currentSeeds.forEach(seed => {
        const cardClass = cardDatabase[seed.name]?.Class;
        if (cardClass) activeClasses.add(cardClass);
    });

    resultsContainer.innerHTML = '';
    resultsContainer.className = 'visual-deck-grid';

    if (tracker) tracker.innerText = `${totalCards}/40`;

    if (currentSeeds.length === 0) {
        resultsContainer.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #888;">No cards added yet. Search above to begin!</div>';
        generateDeckBtn.disabled = true;
        if (title) title.classList.add('hidden');
        if (actionContainer) actionContainer.style.display = 'none'; 
        currentFaction = null;
        activeClasses.clear();
        lastAddedCard = null;
        triggerAICoPilot(); 
        return;
    }

    generateDeckBtn.disabled = totalCards >= 40;

    if (totalCards >= 40) {
        const classArray = Array.from(activeClasses).sort();
        const heroName = heroMap[classArray.join(',')] || `Any ${classArray.join(' / ')} Hero`;
        const isPlant = currentFaction === "Plant";
        const aiDeckName = generateDeckName(currentSeeds, isPlant);
        
        if (title) {
            title.classList.remove('hidden');
            title.innerHTML = `
                <div style="font-size: 1.2em; color: var(--accent); font-style: italic;">"${aiDeckName}"</div>
                <div style="font-size: 0.75em; color: var(--text-secondary); margin-top: 5px;">A Deck for ${heroName}</div>
            `;
        }
        
        currentClipboardText = `Deck: ${aiDeckName}\nHero: ${heroName}\n\n`;
        if (actionContainer) {
            actionContainer.classList.remove('hidden'); 
            actionContainer.style.display = 'flex'; 
        }
    } else {
        if (title) title.classList.add('hidden');
        if (actionContainer) actionContainer.style.display = 'none'; 
    }

    let displaySeeds = [...currentSeeds].sort((a, b) => {
        const costA = cardDatabase[a.name]?.Cost || 0;
        const costB = cardDatabase[b.name]?.Cost || 0;
        if (costA !== costB) return costA - costB;
        return a.name.localeCompare(b.name);
    });

    displaySeeds.forEach((seed, index) => {
        const displayName = seed.name.replace(/_/g, ' ');
        const dbName = displayName.replace(/ /g, '_');
        const disablePlus = seed.count >= 4 || totalCards >= 40;

        const cardDiv = document.createElement('div');
        // 2. ADD THE ANIMATION CLASS AND DYNAMIC DELAY
        cardDiv.className = 'visual-card pop-animate';
        cardDiv.style.animationDelay = `${index * 35}ms`;
        
        const img = document.createElement('img');
        img.src = `card_images/${dbName}.png`;
        img.alt = displayName;
        img.title = displayName;
        img.onerror = function() { this.onerror = null; this.src = `card_images/${dbName}.webp`; };

        const badge = document.createElement('div');
        badge.className = 'card-quantity';
        badge.textContent = `x${seed.count}`;

        const controls = document.createElement('div');
        controls.className = 'visual-card-controls';
        controls.innerHTML = `
            <button class="seed-btn minus-btn" data-name="${seed.name}">-</button>
            <button class="seed-btn swap-btn" data-name="${seed.name}">↔</button>
            <button class="seed-btn plus-btn" data-name="${seed.name}" ${disablePlus ? 'disabled' : ''}>+</button>
        `;

        cardDiv.appendChild(img);
        cardDiv.appendChild(badge);
        cardDiv.appendChild(controls);
        resultsContainer.appendChild(cardDiv);

        cardDiv.addEventListener('click', () => {
            const isOpen = cardDiv.classList.contains('show-controls');
            document.querySelectorAll('.visual-card.show-controls').forEach(el => el.classList.remove('show-controls'));
            if (!isOpen) cardDiv.classList.add('show-controls');
        });

        controls.addEventListener('click', e => {
            e.stopPropagation();
        });

        if (totalCards >= 40) {
            currentClipboardText += `${seed.count}x ${displayName}\n`;
        }
    });

    attachQuantityListeners();
    triggerAICoPilot();
    updateDeckStats();
}

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
                    if (lastAddedCard === name) lastAddedCard = null;
                    if (activeClasses.size < 2) heroAnnounced = false;
                }
                renderSeeds();
            }
        });
    });

    document.querySelectorAll('.plus-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const name = e.target.getAttribute('data-name');
            const seed = currentSeeds.find(s => s.name === name);
            if (seed && seed.count < 4 && getTotalCards() < 40) {
                seed.count++;
                lastAddedCard = name; // Update context to the card they modified
                renderSeeds();
            }
        });
    });
    document.querySelectorAll('.swap-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const name = e.target.getAttribute('data-name');
        showSwapSuggestions(name);
    });
});
}

if (clearSeedsBtn) {
    clearSeedsBtn.addEventListener('click', () => {
        currentSeeds = [];
        currentFaction = null;
        activeClasses.clear();
        lastAddedCard = null;
        heroAnnounced = false;
        seedInput.value = '';
        renderSeeds();
        if (typeof updateDeckStats === 'function') updateDeckStats();
    });
}
// --- SPECIFIC COMBO CALLOUTS ---
const comboDictionary = [
    {
        // Pogo + MUG
        cards: ["Pogo_Zombie", "Mixed-Up_Gravedigger"],
        message: "**Pogo Zombie** clears a lane, and **Mixed-Up Gravedigger** resets him into a gravestone to do it all over again. Brutal!"
    },
    {
        // Pineclone + Swarm
        cards: ["Pineclone", "Shroom_For_Two"],
        message: "**Shroom for Two** gives you two bodies for 1 sun, perfectly setting up a massive board-wide **Pineclone** transformation."
    },
    {
        // Valkyrie + Mustache Monument
        cards: ["Valkyrie", "Mustache_Monument"],
        message: "Grow her massive in your hand, then drop her on the **Mustache Monument** for a devastating bonus attack."
    },
    {
        // Hearty Coach + Sports
        cards: ["Zombie_Coach", "Team_Mascot"],
        message: "**Team Mascot** buffs your team, and **Zombie Coach** makes them completely invincible. Unstoppable!"
    },
    {
        // Barrel + Mission
        cards: ["Barrel_Of_Deadbeards", "Final_Mission"],
        message: "**Final Mission** destroys your **Barrel of Deadbeards** to deal 4 damage, which triggers the Barrel to wipe out 1-health plants and spawn a 4/3 pirate. Pure value!"
    },
    {
        // Buddy + Pepper
        cards: ["Li'l_Buddy", "Pepper_M.D."],
        message: "A 0-cost **Lil Buddy** instantly heals you, immediately triggering **Pepper M.D.**'s ability to give it a massive growth spurt on the exact same turn!"
    },
    {
        // ANB + Jelly
        cards: ["Admiral_Navy_Bean", "Jelly_Bean"],
        message: "**Admiral Navy Bean** continuously chips away at the Zombie Hero, and makes the perfect Bean evolution target for **Jelly Bean** to bounce massive threats away!"
    },
    {
        // Photosynthesizer + Tricarrotops
        cards: ["Photosynthesizer", "Tricarrotops"],
        message: "**Photosynthesizer** beefs up your **Tricarrotops**'s health, and the card it conjures instantly triggers its Dino-Roar! A massive dino for super cheap."
    },
    {
        // Spinach + Beanstalk
        cards: ["Savage_Spinach", "Typical_Beanstalk"],
        message: "Evolving **Savage Spinach** off your Leafy **Typical Beanstalk** gives every Plant in your hand a massive +2/+2 boost."
    },
    {
        // Imp-Throwing + Toxic
        cards: ["Imp_Throwing_Imp", "Toxic_Waste_Imp"],
        message: "**Toxic Waste Imp** gives all Imps Deadly, turning the tiny Swabbies thrown by your **Imp-Throwing Imp** into lethal, guaranteed removal tools!"
    },
    {
        // Commander + Imp-Throwing
        cards: ["Imp_Commander", "Imp_Throwing_Imp"],
        message: "When **Imp-Throwing Imp** tosses buddies into empty water lanes, **Imp Commander** ensures they draw you cards every time they hit the hero. Incredible draw engine!"
    },
    {
        // Pea Patch + Spinach
        cards: ["Pea_Patch", "Savage_Spinach"],
        message: "**Pea Patch** is the perfect Leafy target for **Savage Spinach**. Your hand gets the +2/+2 evolution buff, and the Spinach itself gets the Pea Patch stats!"
    },
    {
        // Flag + Manager
        cards: ["Flag_Zombie", "Middle_Manager"],
        message: "**Flag Zombie** makes your swarms cheap, and since he's a Professional, he permanently buffs your **Middle Manager** whenever he takes a hit. Synergistic synergy!"
    },
    {
        // Heartichoke + Flytraplanet
        cards: ["Heartichoke", "Venus_Flytraplanet"],
        message: "When **Heartichoke** damages the Zombie Hero on a **Venus Flytraplanet**, it heals you. That heal triggers the Heartichoke to deal damage again, creating an endless cycle of healing and pain!"
    },
    {
        // Snowdrop + Winter Squash
        cards: ["Snowdrop", "Winter_Squash"],
        message: "**Winter Squash** instantly shatters any Zombie that gets frozen, while **Snowdrop** simultaneously absorbs that freeze to gain a massive +2/+2. Cold and calculated!"
    },
    {
        // Goat + Hover-Goat
        cards: ["Goat", "Hover-Goat_3000"],
        message: "**Hover-Goat_3000** gives your regular **Goat** a beefy +2/+2 stats boost, and whenever a Goat takes damage, it just keeps growing stronger!"
    },
    {
        // Fig (Transfiguration) + Imitater
        cards: ["Fig", "Imitater"], // Change "Transfiguration" to "Fig" if that's how it is named in your cardDatabase!
        message: "Playing **Transfiguration** into an **Imitater** gives you TWO massive bodies that will both mutate into more expensive, game-ending threats at the end of the turn!"
    },
    {
        // CycleCap
        cards: ["Astro_Shroom", "Planet_of_the_Grapes"],
        message: "**Astro-Shroom** deals damage when you play a plant, triggering **Planet of the Grapes** to draw a card, which lets you play MORE plants!"
    },
    {
        // Con Man + Regifter
        cards: ["Quickdraw_Con_Man", "Regifting_Zombie"],
        message: "**Regifting Zombie** forces both players to draw cards, instantly triggering **Quickdraw Con Man**'s ability to burn the Plant Hero's health. Aggressive draw!"
    },
    {
        // Teacher + Going Viral
        cards: ["Teacher", "Going_Viral"],
        message: "**Zombology Teacher** reduces the cost of tricks, making **Going Viral** incredibly cheap to play and shuffle, easily swarming the board with Frenzy-fueled zombies."
    },
    {
        // Three-Nut + Garlic
        cards: ["Three-Nut", "Garlic"],
        message: "**Three-Nut** instantly sets any plant's attack to 3. Combine this with the massive 5-health of a 1-cost **Garlic** to create an aggressively cheap and beefy front line."
    },
    {
        // Onion Rings + Lil Buddy
        cards: ["Onion_Rings", "Li'l_Buddy"],
        message: "**Onion Rings** turns every plant in your hand into a 4/4. Suddenly, your free **Lil Buddy** becomes a 0-cost 4/4 that still heals you. Insane value!"
    },
    {
        // Cob Cannon + Lil Buddy
        cards: ["Cob_Cannon", "Li'l_Buddy"],
        message: "Need instant removal? Drop a 0-cost **Lil Buddy**, then immediately evolve your **Cob Cannon** on it to destroy a Zombie and leave behind a 4/6 body."
    },
    {
        // Warlord + MUG
        cards: ["Intergalactic_Warlord", "Mixed-Up_Gravedigger"],
        message: "**Intergalactic Warlord** buffs your entire board permanently. Use **Mixed-Up Gravedigger** to hide him, and when he pops back out, he triggers his massive team-buff all over again!"
    },
    {
        // Briar Rose + Poppin' Poppies
        cards: ["Briar_Rose", "Poppin'_Poppies"],
        message: "**Poppin' Poppies** floods the board with 1-health Lil' Buddies. With **Briar Rose** on the field, every single one of those tiny flowers becomes a lethal, zombie-destroying trap!"
    },
    {
        // GTI + Fireworks
        cards: ["Gargantuar-Throwing_Imp", "Fireworks_Zombie"],
        message: "**Fireworks Zombie** deals 1 damage to everything, which instantly pokes your **Gargantuar-Throwing Imp** and causes him to immediately throw a massive Gargantuar onto the board!"
    },
    {
        // Dr. Spacetime + Buried Treasure
        cards: ["Dr._Spacetime", "Buried_Treasure"],
        message: "Play **Buried Treasure** with **Dr. Spacetime** on the board. The Treasure conjures a Legendary, and Spacetime makes it cheaper. You're swimming in discounted, high-tier cards!"
    },
    {
        // Galacta-Cactus + Pear Cub
        cards: ["Galacta-Cactus", "Pear_Cub"],
        message: "When **Galacta-Cactus** gets destroyed, its 1-damage explosion is the perfect trigger to crack open your **Pear Cub** and unleash the massive Grizzly Pear inside."
    }
];
function parseCardList(cardList) {
    const map = {};
    (cardList || []).forEach(entry => {
        const firstSpace = entry.indexOf(' ');
        const countStr = entry.substring(0, firstSpace).replace(/x/i, '');
        const count = parseInt(countStr) || 1;
        const cardName = entry.substring(firstSpace + 1).trim();
        map[cardName] = (map[cardName] || 0) + count;
    });
    return map;
}

function getClosestDeckMatch() {
    if (!fullDatabase) return null;

    const currentMap = {};
    currentSeeds.forEach(seed => {
        currentMap[seed.name] = seed.count;
    });

    let bestDeck = null;
    let bestScore = -1;

    Object.values(fullDatabase).forEach(deck => {
        const deckMap = parseCardList(deck.cards);

        let overlap = 0;
        for (const cardName in currentMap) {
            overlap += Math.min(currentMap[cardName] || 0, deckMap[cardName] || 0);
        }

        if (overlap > bestScore) {
            bestScore = overlap;
            bestDeck = deck;
        }
    });

    return bestDeck;
}
// --- LIVE DECK ANALYTICS ENGINE ---
function updateDeckStats() {
    const hud = document.getElementById('deckStatsHud');
    if (!hud || getTotalCards() === 0) {
        if (hud) hud.style.display = 'none';
        return;
    }
    
    hud.style.display = 'block';

    let totalCards = 0;
    let totalCost = 0;
    let curve = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, "6+": 0 };
    
    let totalConnection = 0;

    // 1. Crunch the Numbers
    currentSeeds.forEach(seedA => {
        totalCards += seedA.count;
        
        const cost = parseInt(seedA.cost) || 1; 
        totalCost += (cost * seedA.count);

        // Populate Curve
        if (cost <= 1) curve[1] += seedA.count;
        else if (cost === 2) curve[2] += seedA.count;
        else if (cost === 3) curve[3] += seedA.count;
        else if (cost === 4) curve[4] += seedA.count;
        else if (cost === 5) curve[5] += seedA.count;
        else curve["6+"] += seedA.count;

        // --- NEW: COSINE SIMILARITY (True Exclusive Synergy) ---
        let cardBestConnection = 0;
        const freqA = cardFrequencies[seedA.name] || 1;

        currentSeeds.forEach(seedB => {
            if (seedA.name !== seedB.name) {
                const coOccurrences = (synergyMatrix && synergyMatrix[seedA.name] && synergyMatrix[seedA.name][seedB.name]) 
                                      ? synergyMatrix[seedA.name][seedB.name] : 0;
                
                const freqB = cardFrequencies[seedB.name] || 1;
                
                // Cosine Similarity Formula: coOccurrences / sqrt(freqA * freqB)
                // This severely penalizes cards that are just "generic good stuff" 
                // and heavily rewards strict combos.
                const cosineSimilarity = coOccurrences / Math.sqrt(freqA * freqB);
                
                if (cosineSimilarity > cardBestConnection) {
                    cardBestConnection = cosineSimilarity;
                }
            }
        });
        
        totalConnection += (cardBestConnection * seedA.count);
    });

    // 2. Render Mana Curve (Smooth Area Chart)
    const chart = document.getElementById('manaCurveChart');
    const maxCurveVal = Math.max(...Object.values(curve), 1); 
    
    // Extract the counts in order
    const counts = [curve[1], curve[2], curve[3], curve[4], curve[5], curve["6+"]];
    
    // Dynamically grab the exact pixel width of the container to prevent stretching!
    // (We provide a fallback of 300 just in case it can't read the width yet)
    const width = chart.clientWidth > 0 ? chart.clientWidth : 300; 
    const height = 40;
    const xStep = width / (counts.length - 1);
    
    let pathD = `M 0,${height} `; 
    const points = [];
    
    counts.forEach((count, i) => {
        const x = i * xStep;
        const y = height - ((count / maxCurveVal) * (height - 4)) - 2; 
        points.push({x, y});
        pathD += `L ${x},${y} `; 
    });
    
    pathD += `L ${width},${height} Z`; 
    
    // Inject the inline SVG with the exact width so nothing gets distorted
    chart.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%; overflow: visible; display: block;">
            <defs>
                <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#4CAF50" stop-opacity="0.5"/>
                    <stop offset="100%" stop-color="#4CAF50" stop-opacity="0.0"/>
                </linearGradient>
            </defs>
            <path d="${pathD}" fill="url(#curveGradient)" stroke="#4CAF50" stroke-width="2" stroke-linejoin="round" />
            
            ${points.map(p => `
                <circle cx="${p.x}" cy="${p.y}" r="3" fill="#1e1e24" stroke="#4CAF50" stroke-width="1.5" />
            `).join('')}
        </svg>
    `;

    // 3. Render Deck Speed (Average Cost Slider)
    const avgCost = totalCost / totalCards;
    let speedLabel = "Midrange";
    let leftPercent = 50;

    if (avgCost <= 2.2) { speedLabel = "Aggro/Rush"; leftPercent = (avgCost / 2.2) * 33; }
    else if (avgCost > 2.2 && avgCost <= 3.5) { speedLabel = "Midrange"; leftPercent = 33 + (((avgCost - 2.2) / 1.3) * 33); }
    else { speedLabel = "Control/Late"; leftPercent = 66 + (Math.min((avgCost - 3.5) / 2.5, 1) * 34); }

    document.getElementById('deckSpeedLabel').innerText = speedLabel;
    document.getElementById('speedPointer').style.left = `calc(${leftPercent}% - 2px)`;

    // 4. Render True Synergy Score
    let synergyScore = 0;
    if (totalCards > 0 && currentSeeds.length > 1) {
        let rawAvg = totalConnection / totalCards;
        
        // Use an exponent > 1 to crush random noise.
        // A random deck (rawAvg ~0.3) will now score roughly 20-25%.
        // A meta deck (rawAvg ~0.65) will scale up nicely to 85-95%.
        synergyScore = Math.min(Math.round(Math.pow(rawAvg, 1.8) * 220), 100);
        
        // Dampen the score slightly if the deck is super tiny (less than 6 cards)
        if (totalCards < 6) {
            synergyScore = Math.round(synergyScore * (totalCards / 6));
        }

    } else if (totalCards === 1) {
        synergyScore = 5; 
    }

    // Optional: Remove the "minimum 10 score" safety net so bad decks actually show 0-5%.
    // if (currentSeeds.length > 3 && synergyScore < 10) synergyScore = 10;

    document.getElementById('synergyPercent').innerText = `${synergyScore}%`;
    const fillBar = document.getElementById('synergyFill');
    fillBar.style.width = `${synergyScore}%`;
    
   // Dynamic color shifting based on harsh Cosine grading
    if (synergyScore >= 85) {
        fillBar.style.background = "#e91e63"; // Pink/Mythic (Excellent)
    } else if (synergyScore >= 70) {
        fillBar.style.background = "#4CAF50"; // Green (Good)
    } else if (synergyScore >= 50) {
        fillBar.style.background = "#ffb300"; // Yellow (Mid/Okay - 50s and 60s)
    } else {
        fillBar.style.background = "#ff4b4b"; // Red (Bad/Scattered - under 50)
    }
}
document.getElementById('shareDeckBtn').addEventListener('click', function() {
    const cardDictionary = Object.keys(cardDatabase).sort();

    const minimalDeckString = currentSeeds.map(card => {
        const cardIndex = cardDictionary.indexOf(card.name).toString(36); 
        // Use a DOT for counts, and omit it entirely if the count is 4
        return card.count === 4 ? cardIndex : `${cardIndex}.${card.count}`;
    }).join('-'); // Use a HYPHEN to separate cards (100% URL safe!)
    
    // NO MORE btoa() OR encodeURIComponent() needed!
    const shareUrl = `${window.location.origin}${window.location.pathname}?deck=${minimalDeckString}#crafter`;
    
    navigator.clipboard.writeText(shareUrl);
    
    const originalBg = this.style.background;
    this.innerText = "Link Copied!";
    this.style.background = "#4CAF50"; 
    
    setTimeout(() => {
        this.innerText = "Share Link";
        this.style.background = originalBg; 
    }, 2000);
});
window.addEventListener('DOMContentLoaded', () => {
    const deckCode = new URLSearchParams(window.location.search).get('deck');
    if (!deckCode) return;

    let attempts = 0;
    const dataWatcher = setInterval(() => {
        attempts++;
        
        // CHECK ALL REQUIRED DATA, NOT JUST cardDatabase
        const isDatabaseReady = typeof cardDatabase !== 'undefined' && cardDatabase && Object.keys(cardDatabase).length > 0;
        const isFullDatabaseReady = typeof fullDatabase !== 'undefined' && fullDatabase && Object.keys(fullDatabase).length > 0;
        // Add checks for cardAverageCopies or comboDictionary if they load asynchronously too
        
        // Only proceed if ALL dependencies are locked and loaded
        if (isDatabaseReady && isFullDatabaseReady) {
            clearInterval(dataWatcher);
            if (typeof initSynergyMatrix === 'function') initSynergyMatrix();

            try {
                // ... [Rest of your URL parsing logic stays exactly the same]
                const cardDictionary = Object.keys(cardDatabase).sort();
                
                // Set up validation trackers
                let totalCards = 0;
                let isDeckValid = true;
                const parsedSeeds = [];
                const seenCards = new Set(); // Tracks unique cards
                
                const pairs = deckCode.split('-');
                
                for (const pair of pairs) {
                    const [indexStr, countStr] = pair.split('.');
                    const cardIndex = parseInt(indexStr, 36); 
                    
                    // Rule 3: Reject if we have already seen this card
                    if (seenCards.has(cardIndex)) {
                        isDeckValid = false;
                        break; // Stop parsing immediately
                    }
                    seenCards.add(cardIndex);

                    const cardName = cardDictionary[cardIndex];
                    const fullCardData = cardDatabase[cardName];
                    
                    if (fullCardData) {
                        const count = countStr ? parseInt(countStr, 10) : 4;
                        
                        // Rule 1: Reject if any card count is not 1, 2, 3, or 4
                        if (isNaN(count) || count < 1 || count > 4) {
                            isDeckValid = false;
                            break; // Stop parsing immediately
                        }
                        
                        totalCards += count;
                        
                        // Rule 2: Reject if total deck size exceeds 40
                        if (totalCards > 40) {
                            isDeckValid = false;
                            break; // Stop parsing immediately
                        }
                        
                       if (!currentFaction) {
    currentFaction = plantClasses.has(fullCardData.Class) ? "Plant" : "Zombie";
}
                        
                        parsedSeeds.push({ 
                            ...fullCardData, 
                            name: cardName,
                            count: count,
                            class: fullCardData.Class,
                            cost: fullCardData.Cost
                        });
                    }
                }
                
                // If validation failed, silently exit and do nothing to the UI
                if (!isDeckValid) return;

                // If we get here, the URL is safe and valid. Apply it.
                currentSeeds = parsedSeeds;
                
                const crafterView = document.getElementById('crafterView');
                if (crafterView) crafterView.classList.remove('hidden');
                
                if (typeof updateDeckStats === 'function') updateDeckStats();
                if (typeof renderSeeds === 'function') renderSeeds();
                
            } catch (error) {
                // Silently catch manual URL tampering
            }
        } else if (attempts > 50) {
            clearInterval(dataWatcher);
        }
    }, 100);
});
// --- 3. CONVERSATIONAL AI CO-PILOT ---
function triggerAICoPilot() {
    window.activeSwapTarget = null;
    const chatFeed = document.getElementById('aiChatFeed');
    if (!chatFeed) return;

   if (currentSeeds.length === 0) {
    // Get an array of all card names from the database
    const cardNames = Object.keys(cardDatabase);
    
    // Pick a random name from that array
    const randomCard = cardNames[Math.floor(Math.random() * cardNames.length)].replace(/_/g, ' ');

    chatFeed.innerHTML = `
        <div class="ai-message system">
            Heey I'm Craaaazy Dave! I'm the best at creating amazing PvZ Heroes decks! 
            Enter a card to get started. Maybe <strong>${randomCard}</strong>?
        </div>
    `;
    return;
}

    if (getTotalCards() >= 40) {
        const closestDeck = getClosestDeckMatch();
        let baseHtml = "";

       if (!closestDeck) {
        baseHtml = `<div class="ai-message system">Your deck is complete! I could not find a close match in the deck database.</div>`;
    } else {
        // Check if the youtube_url exists and is not an empty string
        if (closestDeck.youtube_url) {
            baseHtml = `
                <div class="ai-message system">
                    Your deck is complete! Your deck is closest to 
                    <a href="${closestDeck.youtube_url}" target="_blank" rel="noopener noreferrer" style="font-weight: bold; color: var(--accent, #4CAF50); text-decoration: underline;">
                        ${closestDeck.name}
                    </a>.
                    <div style="margin-top: 6px; font-size: 0.9em; opacity: 0.85;">
                        Video: ${closestDeck.youtube_title || "YouTube deck video"}
                    </div>
                </div>
            `;
        } else {
            // Fallback for no URL: just text, no link, no underline
            baseHtml = `
                <div class="ai-message system">
                    Your deck is complete! Your deck is closest to 
                    <span style="font-weight: bold; color: var(--accent, #4CAF50);">
                        ${closestDeck.name}
                    </span>.
                </div>
            `;
        }
    }

        // --- FIXED: Evaluate ALL possible swaps to find the highest net synergy gain ---
        initSynergyMatrix();
        
        let bestSwapIdea = null;
        let maxImprovement = 0;
        const rawWeight = 0.5;
        const affinityWeight = 0.5;

        // 1. Calculate the base score of every card and compare it to its top replacement
        currentSeeds.forEach(seed => {
            let baseScore = 0;
            currentSeeds.forEach(deckCard => {
                if (deckCard.name === seed.name) return; // Don't score against itself
                
                if (synergyMatrix && synergyMatrix[seed.name] && synergyMatrix[seed.name][deckCard.name]) {
                    const coOccurrences = synergyMatrix[seed.name][deckCard.name];
                    const baseTotalPlays = cardFrequencies[seed.name] || 1;
                    
                    let rawSynergy = coOccurrences;
                    let affinitySynergy = (coOccurrences * coOccurrences) / baseTotalPlays;
                    let blendedSynergy = (rawSynergy * rawWeight) + (affinitySynergy * affinityWeight);
                    
                    let classModifier = 1.0;
                    if (cardDatabase[seed.name].Class !== cardDatabase[deckCard.name].Class) {
                        classModifier = 4.0;
                    }
                    
                    const deckCardPlays = cardFrequencies[deckCard.name] || 1;
                    const volumeEqualizer = 1000 / deckCardPlays;
                    
                    baseScore += (blendedSynergy * classModifier * volumeEqualizer) * deckCard.count;
                }
            });

            // Check if swapping THIS card yields a mathematical improvement
            const recommendations = getTopThreeRecommendations(seed.name);
            if (recommendations.length > 0) {
                const topRec = recommendations[0];
                const improvement = topRec.score - baseScore;
                
                // If it's a positive improvement AND the best one we've found so far, save it
                if (improvement > maxImprovement) {
                    maxImprovement = improvement;
                    bestSwapIdea = {
                        removeCard: seed.name,
                        addCard: topRec.name
                    };
                }
            }
        });

        let swapHtml = "";

        // 2. If we found a swap with a positive net improvement, suggest the best one
        if (bestSwapIdea) {
            const weakName = bestSwapIdea.removeCard.replace(/_/g, ' ');
            const topName = bestSwapIdea.addCard.replace(/_/g, ' ');

            swapHtml = `
                <div class="ai-message system" style="margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                    I found a way to make this deck even better!
                    Swapping out <strong>${weakName}</strong> for <strong>${topName}</strong> would give your deck a nice boost!
                </div>
                
                <div class="ai-recommendations-grid" style="display: flex; gap: 8px; justify-content: center; width: 100%; margin-top: 10px;">
                    <div class="ai-visual-rec" style="flex: 0 1 240px; display: flex; flex-direction: column; align-items: center; padding: 10px; position: relative;">
                        <span style="position: absolute; top: -5px; left: 50%; transform: translateX(-50%); background: #ffb300; color: #fff; font-size: 0.65em; font-weight: bold; padding: 4px 10px; border-radius: 12px; z-index: 2; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.4);">
                            Top Swap Idea
                        </span>
                        
                        <div style="flex-grow: 1; display: flex; align-items: center; justify-content: center; width: 100%; margin: 15px 0 10px 0; gap: 8px;">
                            <img src="card_images/${bestSwapIdea.removeCard}.png" alt="${weakName}" title="${weakName}" onerror="this.onerror=null; this.src='card_images/${bestSwapIdea.removeCard}.webp';" style="flex: 1; max-width: 40%; max-height: 80px; object-fit: contain; filter: grayscale(60%) drop-shadow(0 2px 4px rgba(0,0,0,0.3)); opacity: 0.7;">
                            
                            <span style="font-size: 1.4em; color: #ffb300; font-weight: bold;">➔</span>
                            
                            <img src="card_images/${bestSwapIdea.addCard}.png" alt="${topName}" title="${topName}" onerror="this.onerror=null; this.src='card_images/${bestSwapIdea.addCard}.webp';" style="flex: 1; max-width: 45%; max-height: 90px; object-fit: contain; filter: drop-shadow(0 5px 8px rgba(0,0,0,0.5));">
                        </div>
                        
                        <button class="add-rec-btn generate-btn" data-remove="${bestSwapIdea.removeCard}" data-add="${bestSwapIdea.addCard}" style="width: 100%; padding: 6px 0; font-size: 0.9em; font-weight: bold; margin: 0; margin-top: auto; border-radius: 6px; white-space: nowrap;">
                            Swap
                        </button>

                        <div style="text-align: center; font-size: 0.85em; font-weight: bold; color: #4CAF50; margin-top: 6px; letter-spacing: 0.5px;">
                            Better Synergy
                        </div>
                    </div>
                </div>
            `;
        } else {
            // ONLY triggers if literally no card has a replacement with a higher score
            swapHtml = `
                <div class="ai-message system" style="margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                    Great job on such a cohesive deck!
                </div>
            `;
        }

        chatFeed.innerHTML = baseHtml + swapHtml;
        
        // 3. Attach click listener for the swap button if it rendered
        const swapBtn = chatFeed.querySelector('.add-rec-btn[data-remove]');
        if (swapBtn) {
            swapBtn.addEventListener('click', (e) => {
                const removeName = e.target.getAttribute('data-remove');
                const addName = e.target.getAttribute('data-add');
                applyFullSwap(removeName, addName);
            });
        }
        
        return;
    }

    // --- The rest of your function below for when the deck is NOT complete ---
    initSynergyMatrix(); 
    chatFeed.innerHTML = `<div class="ai-message system"><em>Analyzing synergies...</em></div>`;

    setTimeout(() => {
        const recommendations = getTopThreeRecommendations();
        
        if (recommendations.length === 0) {
            chatFeed.innerHTML = `<div class="ai-message system">I can't find any more valid cards for this combination! Try removing a card.</div>`;
            return;
        }

        const spaceLeft = 40 - getTotalCards();
        const classArray = Array.from(activeClasses).sort();
        const heroName = heroMap[classArray.join(',')] || `a ${classArray.join(' / ')} Hero`;
        
        // Map recommendations with calculated optimal copy counts
        const recData = recommendations.map(rec => {
            const displayName = rec.name.replace(/_/g, ' ');
            const data = cardDatabase[rec.name];
            let targetCopies = 3; 
            
            if (cardAverageCopies && cardAverageCopies[rec.name] && cardAverageCopies[rec.name].appearances > 0) {
                targetCopies = Math.round(cardAverageCopies[rec.name].total / cardAverageCopies[rec.name].appearances);
            }
            // Ensure bounds
            targetCopies = Math.min(targetCopies, spaceLeft, 4);
            if (targetCopies < 1) targetCopies = 1;
            
            return { name: rec.name, displayName, data, targetCopies };
        });

        // 1. Calculate Average Play Frequency to generate smart adjectives
        let avgFreq = 1;
        if (Object.keys(cardFrequencies).length > 0) {
            const sumFreq = Object.values(cardFrequencies).reduce((a, b) => a + b, 0);
            avgFreq = sumFreq / Object.keys(cardFrequencies).length;
        }

        let aiDialogue = "";
        
       // 2. Build the Contextual Greeting based on last action
        let comboTriggered = false;

        if (lastAddedCard) {
            // Check if the last card added completes any combo in our dictionary
            const triggeredCombo = comboDictionary.find(combo => 
                combo.cards.includes(lastAddedCard) && // The card we just added must be part of the combo
                combo.cards.every(c => currentSeeds.some(s => s.name === c)) // ALL cards in the combo must now be in the deck
            );

            if (triggeredCombo) {
                let formattedMessage = triggeredCombo.message
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>');

                aiDialogue = formattedMessage + "<br><br>";
                comboTriggered = true;
            }

            if (!comboTriggered) {
                const lastNameClean = lastAddedCard.replace(/_/g, ' ');
                const lastCardData = cardDatabase[lastAddedCard];
                const lastClass = lastCardData ? lastCardData.Class : "Unknown";
                
                const myFreq = cardFrequencies[lastAddedCard] || 0;

// Quick helper to pick a random phrase from an array
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

let popAdj = "";

// Tier 1: Absolute Meta-Staple (> 3x average)
if (myFreq > avgFreq * 3.0) {
    popAdj = pickRandom([
        "an absolute powerhouse", 
        "a ridiculously popular", 
        "an everywhere-all-at-once", 
        "a top-tier, essential"
    ]);
} 
// Tier 2: Highly Popular (> 1.8x average)
else if (myFreq > avgFreq * 1.8) {
    popAdj = pickRandom([
        "a super reliable", 
        "a heavy-hitting, competitive", 
        "a widely-used", 
        "a trusty, go-to"
    ]);
} 
// Tier 3: The Middle Ground (0.8x to 1.8x average)
else if (myFreq > avgFreq * 0.8) {
    popAdj = pickRandom([
        "a solid, standard", 
        "a completely reasonable", 
        "a fair, middle-of-the-road", 
        "an okay, everyday"
    ]);
} 
// Tier 4: Niche / Questionable (< 0.8x average) - Hinting it's weak
else if (myFreq > avgFreq * 0.3) {
    popAdj = pickRandom([
        "a pretty clunky, situational", 
        "a definitely off-meta (and maybe a bit weak)", 
        "a rarely played", 
        "a somewhat questionable"
    ]);
} 
// Tier 5: Bottom of the Barrel (< 0.3x average) - Calling it out
else {
    popAdj = pickRandom([
        "a bottom-of-the-barrel", 
        "a straight-up desperate", 
        "a very, uh... *brave*", 
        "a highly unpopular (probably for a good reason)"
    ]);
}

                if (currentSeeds.length === 1 && currentSeeds[0].count === getTotalCards()) {
                    aiDialogue = `<strong>${lastNameClean}</strong> is ${popAdj} ${lastClass} card! <br><br>`;
                } else if (activeClasses.size === 2 && !heroAnnounced) {
                    aiDialogue = `This is now officially a <strong>${heroName}</strong> deck! <strong>${lastNameClean}</strong> adds some great synergy. <br><br>`;
                    heroAnnounced = true;
                } else {
                    aiDialogue = `Adding <strong>${lastNameClean}</strong> gives us a great direction! <br><br>`;
                }
            }
        } else {
             if (activeClasses.size === 2) {
                aiDialogue = `This is a <strong>${heroName}</strong> deck! You have some great options from here.<br><br>`;
             } else {
                aiDialogue = `You have some great options for this <strong>${currentFaction}</strong> deck! <br><br>`;
             }
        }

        // 3. Build the suggestion sentence smoothly
        if (recData.length >= 3) {
            aiDialogue += `<strong>${recData[0].displayName}</strong> would fit really well here! My 2nd choice would be <strong>${recData[1].displayName}</strong>, and my 3rd choice is <strong>${recData[2].displayName}</strong>.`;
        } else if (recData.length > 0) {
            aiDialogue += `<strong>${recData[0].displayName}</strong> is my top recommendation to add next!`;
        }

        // 4. Render HTML without markdown asterisks
        let htmlString = `<div class="ai-message system" style="margin-bottom: 10px;">${aiDialogue}</div>`;
        
        htmlString += `<div class="ai-recommendations-grid" style="display: flex; gap: 8px; justify-content: space-between; width: 100%; margin-bottom: 10px; box-sizing: border-box;">`;
        
       recData.forEach((rec, index) => {
            const badgeText = index === 0 ? "Best Fit" : (index === 1 ? "2nd Choice" : "3rd Choice");
            const badgeColor = index === 0 ? "#ffb300" : "var(--accent, #4CAF50)";
            
            htmlString += `
                <div class="ai-visual-rec" style="flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; padding: 5px; position: relative; height: 100%;">
                    
                    <span style="position: absolute; top: -5px; left: 50%; transform: translateX(-50%); background: ${badgeColor}; color: #fff; font-size: 0.65em; font-weight: bold; padding: 4px 10px; border-radius: 12px; z-index: 2; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.4);">
                        ${badgeText}
                    </span>
                    
                    <div style="flex-grow: 1; display: flex; align-items: center; justify-content: center; width: 100%; margin: 12px 0 8px 0;">
                        <img src="card_images/${rec.name}.png" alt="${rec.displayName}" title="${rec.displayName}" onerror="this.onerror=null; this.src='card_images/${rec.name}.webp';" style="max-width: 100%; max-height: 100px; object-fit: contain; filter: drop-shadow(0 5px 8px rgba(0,0,0,0.5));">
                    </div>
                    
                    <button class="add-rec-btn generate-btn" data-name="${rec.name}" data-class="${rec.data.Class}" data-amount="${rec.targetCopies}" style="width: 100%; padding: 6px 0; font-size: 0.8em; font-weight: bold; margin: 0; margin-top: auto; border-radius: 6px; white-space: nowrap;">
                        Add x${rec.targetCopies}
                    </button>
                    
                </div>
            `;
        });

        htmlString += `</div>`; // Close the flex container

        chatFeed.innerHTML = htmlString;

        // Attach listeners to the new AI buttons using the recommended amount
        chatFeed.querySelectorAll('.add-rec-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const amount = parseInt(e.target.getAttribute('data-amount')) || 1;
                addSeed(e.target.getAttribute('data-name'), e.target.getAttribute('data-class'), currentFaction, amount);
            });
        });

    }, 50); 
}

function getTopThreeRecommendations(baseCardName = null) {
    let candidatePool = Object.keys(cardDatabase);
    let scoredCandidates = [];

    const rawWeight = 0.5;
    const affinityWeight = 0.5;

    const baseSeed = baseCardName ? currentSeeds.find(c => c.name === baseCardName) : null;
    const baseCount = baseSeed ? baseSeed.count : 0;

    // Build the class set after removing the clicked card entirely
    let postSwapClasses = new Set();
    currentSeeds.forEach(card => {
        if (baseCardName && card.name === baseCardName) return;
        postSwapClasses.add(card.class);
    });

    candidatePool.forEach(candidateName => {
        if (baseCardName && candidateName === baseCardName) return;

        const candidateData = cardDatabase[candidateName];
        const candidateClass = candidateData.Class;
        const candidateFaction = plantClasses.has(candidateClass) ? "Plant" : "Zombie";

        if (candidateFaction !== currentFaction) return;

        // Enforce 2-class limit AFTER the swap
        const trialClasses = new Set(postSwapClasses);
        trialClasses.add(candidateClass);
        if (trialClasses.size > 2) return;

        const existingCopy = currentSeeds.find(c => c.name === candidateName);

        // Normal add mode: can't exceed 4 copies
        // Swap mode: replacement must fit within the copies being removed
        if (baseCardName) {
            const existingCandidateCount = existingCopy ? existingCopy.count : 0;
            if (existingCandidateCount + baseCount > 4) return;
        } else {
            if (existingCopy && existingCopy.count >= 4) return;
            if (!activeClasses.has(candidateClass) && activeClasses.size >= 2) return;
        }

        let score = 0;

        currentSeeds.forEach(deckCard => {
            // In swap mode, ignore the removed card completely
            if (baseCardName && deckCard.name === baseCardName) return;

            if (synergyMatrix && synergyMatrix[candidateName] && synergyMatrix[candidateName][deckCard.name]) {
                const coOccurrences = synergyMatrix[candidateName][deckCard.name];
                const candidateTotalPlays = cardFrequencies[candidateName] || 1;

                let rawSynergy = coOccurrences;
                let affinitySynergy = (coOccurrences * coOccurrences) / candidateTotalPlays;
                let blendedSynergy = (rawSynergy * rawWeight) + (affinitySynergy * affinityWeight);

                let classModifier = 1.0;
                if (cardDatabase[candidateName].Class !== cardDatabase[deckCard.name].Class) {
                    classModifier = 4.0;
                }

                const deckCardPlays = cardFrequencies[deckCard.name] || 1;
                const volumeEqualizer = 1000 / deckCardPlays;

                score += (blendedSynergy * classModifier * volumeEqualizer) * deckCard.count;
            }
        });

        if (score > 0) {
            scoredCandidates.push({ name: candidateName, score: score });
        }
    });

    scoredCandidates.sort((a, b) => b.score - a.score);
    return scoredCandidates.slice(0, 3);
}
function showSwapSuggestions(baseCardName) {
    const chatFeed = document.getElementById('aiChatFeed');
    if (!chatFeed) return;

    // --- NEW: QoL Toggle Logic ---
    // If clicking swap on the same card that is already open, close it and return to the normal Co-Pilot
    if (window.activeSwapTarget === baseCardName) {
        window.activeSwapTarget = null;
        triggerAICoPilot(); 
        return;
    }
    // Otherwise, set it as the new active target
    window.activeSwapTarget = baseCardName;
    // -----------------------------

    const baseSeed = currentSeeds.find(c => c.name === baseCardName);
    if (!baseSeed) return;
    
    const displayName = baseCardName.replace(/_/g, ' ');
    initSynergyMatrix();

    chatFeed.innerHTML = `<div class="ai-message system"><em>Finding the best replacements for ${displayName}...</em></div>`;

    setTimeout(() => {
        const replacements = getTopThreeRecommendations(baseCardName);
        
        if (replacements.length === 0) {
            chatFeed.innerHTML = `<div class="ai-message system">I could not find any good replacements for <strong>${displayName}</strong>.</div>`;
            return;
        }

        let baseScore = 0;
        const rawWeight = 0.5;
        const affinityWeight = 0.5;
        
        currentSeeds.forEach(deckCard => {
            if (deckCard.name === baseCardName) return; 
            
            if (synergyMatrix && synergyMatrix[baseCardName] && synergyMatrix[baseCardName][deckCard.name]) {
                const coOccurrences = synergyMatrix[baseCardName][deckCard.name];
                const baseTotalPlays = cardFrequencies[baseCardName] || 1;
                
                let rawSynergy = coOccurrences;
                let affinitySynergy = (coOccurrences * coOccurrences) / baseTotalPlays;
                let blendedSynergy = (rawSynergy * rawWeight) + (affinitySynergy * affinityWeight);
                
                let classModifier = 1.0;
                if (cardDatabase[baseCardName].Class !== cardDatabase[deckCard.name].Class) {
                    classModifier = 4.0;
                }
                
                const deckCardPlays = cardFrequencies[deckCard.name] || 1;
                const volumeEqualizer = 1000 / deckCardPlays;
                
                baseScore += (blendedSynergy * classModifier * volumeEqualizer) * deckCard.count;
            }
        });

        let html = `<div class="ai-message system">We might be able to do better than <strong>${displayName}</strong>! Here's the top alternatives:</div>`;
        html += `<div class="ai-recommendations-grid" style="display: flex; gap: 8px; justify-content: space-between; width: 100%; margin-bottom: 10px; box-sizing: border-box;">`;
        
        replacements.forEach((rec, index) => {
            const cardName = rec.name.replace(/_/g, ' ');
            const badgeText = index === 0 ? "Best Fit" : (index === 1 ? "2nd Choice" : "3rd Choice");
            const badgeColor = index === 0 ? "#ffb300" : "var(--accent, #4CAF50)";
            
            const isBetter = rec.score > baseScore;
            const comparisonText = isBetter ? "Better" : "Worse";
            const comparisonColor = isBetter ? "#4CAF50" : "#f44336"; 
            
            html += `
                <div class="ai-visual-rec" style="flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; padding: 5px; position: relative; height: 100%;">
                    
                    <span style="position: absolute; top: -5px; left: 50%; transform: translateX(-50%); background: ${badgeColor}; color: #fff; font-size: 0.65em; font-weight: bold; padding: 4px 10px; border-radius: 12px; z-index: 2; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.4);">
                        ${badgeText}
                    </span>
                    
                    <div style="flex-grow: 1; display: flex; align-items: center; justify-content: center; width: 100%; margin: 12px 0 8px 0;">
                        <img src="card_images/${rec.name}.png" alt="${cardName}" title="${cardName}" onerror="this.onerror=null; this.src='card_images/${rec.name}.webp';" style="max-width: 100%; max-height: 100px; object-fit: contain; filter: drop-shadow(0 5px 8px rgba(0,0,0,0.5));">
                    </div>
                    
                    <button class="add-rec-btn generate-btn" data-remove="${baseCardName}" data-add="${rec.name}" style="width: 100%; padding: 6px 0; font-size: 0.8em; font-weight: bold; margin: 0; margin-top: auto; border-radius: 6px; white-space: nowrap;">
                        Swap
                    </button>

                    <div style="text-align: center; font-size: 0.85em; font-weight: bold; color: ${comparisonColor}; margin-top: 6px; letter-spacing: 0.5px;">
                        ${comparisonText}
                    </div>
                    
                </div>
            `;
        });
        
        html += `</div>`;
        chatFeed.innerHTML = html;
        
        chatFeed.querySelectorAll('.add-rec-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const removeName = e.target.getAttribute('data-remove');
                const addName = e.target.getAttribute('data-add');
                applyFullSwap(removeName, addName);
            });
        });

    }, 50);
}
function applyFullSwap(removeName, addName) {
    const removeSeed = currentSeeds.find(s => s.name === removeName);
    const addData = cardDatabase[addName];
    if (!removeSeed || !addData) return;

    const removeCount = removeSeed.count;
    const existingAdd = currentSeeds.find(s => s.name === addName);

    // If the replacement would exceed 4 copies, do nothing.
    if (existingAdd && existingAdd.count + removeCount > 4) return;

    // Remove all copies of the chosen card
    currentSeeds = currentSeeds.filter(s => s.name !== removeName);

    // Add the same number of copies of the replacement
    if (existingAdd) {
        existingAdd.count += removeCount;
    } else {
        currentSeeds.push({
            name: addName,
            count: removeCount,
            class: addData.Class,
            faction: plantClasses.has(addData.Class) ? "Plant" : "Zombie",
            cost: addData.Cost
        });
    }

    activeClasses.clear();
    currentSeeds.forEach(s => activeClasses.add(s.class));
    if (activeClasses.size < 2) heroAnnounced = false;

    lastAddedCard = addName;
    renderSeeds();
}

// --- 4. SYNERGY ENGINE (Background Math) ---
let synergyMatrix = null;
let cardFrequencies = null;
let cardAverageCopies = null;

function initSynergyMatrix() {
    if (synergyMatrix) return;
    synergyMatrix = {};
    cardFrequencies = {}; 
    cardAverageCopies = {}; 

    const decks = Object.values(fullDatabase);
    const deckTimestamps = decks.map(d => {
        const time = d.upload_date ? new Date(d.upload_date).getTime() : 0;
        return isNaN(time) ? 0 : time;
    });
    
    deckTimestamps.sort((a, b) => a - b);
    const totalDecks = deckTimestamps.length;
    const threshold50 = deckTimestamps[Math.floor(totalDecks * 0.50)];
    const threshold05 = deckTimestamps[Math.floor(totalDecks * 0.94)];

    decks.forEach(deck => {
        let deckWeight = 0.2; 
        const time = deck.upload_date ? new Date(deck.upload_date).getTime() : 0;
        const validTime = isNaN(time) ? 0 : time;

        if (validTime >= threshold05) {
            deckWeight = 4.0; 
        } else if (validTime >= threshold50) {
            deckWeight = 1.0; 
        }

        const parsedCards = deck.cards.map(c => {
            const firstSpace = c.indexOf(' ');
            const countStr = c.substring(0, firstSpace).replace(/x/i, '');
            const count = parseInt(countStr) || 1; 
            const cardName = c.substring(firstSpace + 1).trim();
            return { name: cardName, count: count };
        });

        const cleanCards = parsedCards.map(pc => pc.name);

        parsedCards.forEach(card => {
            cardFrequencies[card.name] = (cardFrequencies[card.name] || 0) + deckWeight;
            if (!cardAverageCopies[card.name]) {
                cardAverageCopies[card.name] = { total: 0, appearances: 0 };
            }
            cardAverageCopies[card.name].total += (card.count * deckWeight);
            cardAverageCopies[card.name].appearances += deckWeight;
        });

        for (let i = 0; i < cleanCards.length; i++) {
            const cardA = cleanCards[i];
            if (!synergyMatrix[cardA]) synergyMatrix[cardA] = {};
            
            for (let j = 0; j < cleanCards.length; j++) {
                if (i === j) continue;
                const cardB = cleanCards[j];
                synergyMatrix[cardA][cardB] = (synergyMatrix[cardA][cardB] || 0) + deckWeight;
            }
        }
    });
}

// --- 5. FINISH FOR ME (Auto-Generate Remaining) ---
generateDeckBtn.addEventListener('click', () => {
    initSynergyMatrix(); 
    generateDeckBtn.disabled = true;
    generateDeckBtn.innerText = "Calculating Synergies...";

    setTimeout(() => {
        currentSeeds = buildOptimizedDeck(); 
        lastAddedCard = null; // Clear context so AI summarizes full deck
        renderSeeds(); 
        generateDeckBtn.innerText = "Finish For Me ✨";
    }, 50);
});

function buildOptimizedDeck() {
    let workingDeck = currentSeeds.map(s => ({...s}));
    let workingClasses = new Set(activeClasses);
    let deckFaction = currentFaction;
    
    const rawWeight = 0.2 + (Math.random() * 0.40);
    const affinityWeight = 1.0 - rawWeight;
    const isBudget = budgetToggle ? budgetToggle.checked : false;
    const isSuperBudget = superBudgetToggle ? superBudgetToggle.checked : false;

    while (true) {
        let totalCards = workingDeck.reduce((sum, c) => sum + c.count, 0);
        if (totalCards >= 40) break;

        let expensiveCount = workingDeck.reduce((sum, c) => {
            if (!cardDatabase[c.name]) return sum;
            const r = cardDatabase[c.name].Rarity;
            return (r === "Super-Rare" || r === "Event") ? sum + c.count : sum;
        }, 0);

        let bestCard = null;
        let bestScore = -1;
        let candidatePool = Object.keys(cardDatabase);
        const slotsLeft = 40 - totalCards;
        const currentOrphans = workingDeck.filter(c => c.count === 1).length;

        if (slotsLeft <= currentOrphans || slotsLeft === 1) {
            candidatePool = workingDeck.map(c => c.name);
        }

        candidatePool.forEach(candidateName => {
            const candidateData = cardDatabase[candidateName];
            const candidateClass = candidateData.Class;
            const candidateFaction = plantClasses.has(candidateClass) ? "Plant" : "Zombie";

            if (candidateFaction !== deckFaction) return; 
            if (!workingClasses.has(candidateClass) && workingClasses.size >= 2) return; 

            const existingCopy = workingDeck.find(c => c.name === candidateName);
            const currentCopies = existingCopy ? existingCopy.count : 0;
            if (currentCopies >= 4) return; 

            if (isBudget || isSuperBudget) {
                const rarity = candidateData.Rarity;
                if (rarity === "Legendary") return; 

                if (rarity === "Super-Rare" || rarity === "Event") {
                    if (isSuperBudget) {
                        if (expensiveCount >= 4) return;
                        if (currentCopies === 0 && expensiveCount > 0) return;
                    } else {
                        if (currentCopies === 0 && expensiveCount > 13) return;
                    }
                }
            }

            let score = 0;
            workingDeck.forEach(deckCard => {
                if (synergyMatrix && synergyMatrix[candidateName] && synergyMatrix[candidateName][deckCard.name]) {
                    const coOccurrences = synergyMatrix[candidateName][deckCard.name];
                    const candidateTotalPlays = cardFrequencies[candidateName] || 1;
                    
                    let rawSynergy = coOccurrences;
                    let affinitySynergy = (coOccurrences * coOccurrences) / candidateTotalPlays; 
                    let blendedSynergy = (rawSynergy * rawWeight) + (affinitySynergy * affinityWeight);
                    
                    let classModifier = 1.0;
                    if (cardDatabase[candidateName].Class !== cardDatabase[deckCard.name].Class) {
                        classModifier = 4.0;  
                    }

                    const deckCardPlays = cardFrequencies[deckCard.name] || 1;
                    const volumeEqualizer = 1000 / deckCardPlays; 
                    const isOriginalSeed = currentSeeds.some(s => s.name === deckCard.name);

                    score += (blendedSynergy * classModifier * volumeEqualizer) * deckCard.count * (isOriginalSeed ? 3 : 1);
                }
            });

            if (score === 0) score = 0.1;

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

// --- 6. NAMING & COPY LOGIC ---
function generateDeckName(deck, isPlant) {
    const plantAdjectives = ["Blooming", "Verdant", "Photosynthetic", "Savage", "Radiant", "Overgrown", "Rooted", "Spicy", "Leafy", "Sun-Soaked", "Vengeful", "Primal", "Flourishing", "Thorny", "Botanical", "Wild", "Untamed", "Raging", "Solar", "Fierce", "Bark-Biting", "Bountiful", "Vibrant", "Enraged", "Majestic", "Vineswept"];
    const zombieAdjectives = ["Undead", "Toxic", "Gargantuan", "Vicious", "Ruthless", "Chaotic", "Dastardly", "Sneaky", "Brain-Hungry", "Galvanized", "Necrotic", "Ghastly", "Mad", "Cryptic", "Shambling", "Bizarre", "Mechanical", "Grotesque", "Apocalyptic", "Relentless", "Monstrous", "Vile", "Cybernetic", "Diabolical", "Mutated", "Stinky"];
    const nouns = ["Assault", "Synergy", "Brigade", "Beatdown", "Control", "Swarm", "Uprising", "Horde", "Protocol", "Rush", "Aggro", "Tempo", "Engine", "Onslaught", "Vanguard", "Tactics", "Ambush", "March", "Legion", "Blitz", "Rebellion", "Syndicate", "Empire", "Invasion", "Cartel", "Offensive"];
    
    const coreCards = deck.filter(c => c.count >= 3);
    let signatureCardName = "Mystery";
    
    if (coreCards.length > 0) {
        const randomCore = coreCards[Math.floor(Math.random() * coreCards.length)];
        signatureCardName = randomCore.name.replace(/_/g, ' ');
    } else {
        const highestCost = deck.reduce((prev, current) => (prev.cost > current.cost) ? prev : current);
        signatureCardName = highestCost.name.replace(/_/g, ' ');
    }

    const prefixes = isPlant ? plantAdjectives : zombieAdjectives;
    const adj = prefixes[Math.floor(Math.random() * prefixes.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];

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
        `The ${adj} ${noun}` 
    ];
    return formats[Math.floor(Math.random() * formats.length)];
}

const copyDeckBtn = document.getElementById('copyDeckBtn');
if (copyDeckBtn) {
    copyDeckBtn.addEventListener('click', (e) => {
        if (!currentClipboardText) return;
        navigator.clipboard.writeText(currentClipboardText).then(() => {
            const btn = e.target;
            btn.innerText = "Copied!";
            btn.style.background = "#4CAF50"; 
            setTimeout(() => {
                btn.innerText = "Copy Text";
                btn.style.background = ""; 
            }, 2000);
        }).catch(err => console.error("Failed to copy text: ", err));
    });
}
const downloadBtn = document.getElementById('downloadImageBtn');
if (downloadBtn) {
    downloadBtn.addEventListener('click', async (e) => {
        if (currentSeeds.length === 0) return;

        const btn = e.target;
        const originalText = btn.innerText;
        btn.innerText = "Saving...";
        btn.disabled = true;

        try {
            // 1. Grab Title and Hero directly from the DOM so it perfectly matches the screen
            const titleContainer = document.getElementById('generatedDeckTitle');
            let mainTitleText = "My Deck";
            let subTitleText = "";
            
            if (titleContainer) {
                const divs = titleContainer.querySelectorAll('div');
                if (divs.length >= 2) {
                    mainTitleText = divs[0].innerText.replace(/"/g, ''); 
                    subTitleText = divs[1].innerText;
                } else if (titleContainer.innerText.trim() !== '') {
                    mainTitleText = titleContainer.innerText;
                }
            }

            // 2. Setup Canvas Grid Math
            const padding = 40;
            const cardBoxWidth = 100;
            const cardBoxHeight = 140; 
            const gap = 25;
            const columns = 6;
            const rows = Math.ceil(currentSeeds.length / columns);
            
            const canvasWidth = padding * 2 + (columns * cardBoxWidth) + ((columns - 1) * gap); 
            const headerHeight = 110;
            const rowHeight = cardBoxHeight + 45; 
            const watermarkHeight = 30;
            
            const canvasHeight = padding + headerHeight + (rows * rowHeight) + watermarkHeight;
            
            const canvas = document.createElement('canvas');
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            const ctx = canvas.getContext('2d');

            // 3. Draw Background
            ctx.fillStyle = '#12181b';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // 4. Draw Header Titles
            ctx.textAlign = 'center';
            ctx.fillStyle = '#00b4d8';
            ctx.font = 'bold 36px sans-serif';
            ctx.fillText(mainTitleText, canvasWidth / 2, padding + 35);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '18px sans-serif';
            if (subTitleText) ctx.fillText(subTitleText, canvasWidth / 2, padding + 70);

            // 5. SORT THE CARDS (Matches the UI layout)
            const sortedSeeds = [...currentSeeds].sort((a, b) => {
                const costA = cardDatabase[a.name]?.Cost || 0;
                const costB = cardDatabase[b.name]?.Cost || 0;
                if (costA !== costB) return costA - costB;
                return a.name.localeCompare(b.name);
            });

            // Instantly load all sorted images into memory
            const loadedImages = await Promise.all(sortedSeeds.map(seed => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = "anonymous"; 
                    const dbName = seed.name.replace(/ /g, '_');
                    
                    img.onload = () => resolve({ img, seed });
                    img.onerror = () => {
                        const imgWebp = new Image();
                        imgWebp.crossOrigin = "anonymous";
                        imgWebp.onload = () => resolve({ img: imgWebp, seed });
                        imgWebp.onerror = () => resolve({ img: null, seed }); 
                        imgWebp.src = `card_images/${dbName}.webp`;
                    };
                    img.src = `card_images/${dbName}.png`;
                });
            }));

            // 6. Draw the Cards and Labels
            loadedImages.forEach((item, index) => {
                const col = index % columns;
                const row = Math.floor(index / columns);
                
                const x = padding + (col * (cardBoxWidth + gap));
                const y = padding + headerHeight + (row * rowHeight);

                // Anti-Squish Logic
                if (item.img) {
                    const imgAspect = item.img.width / item.img.height;
                    const boxAspect = cardBoxWidth / cardBoxHeight;
                    let drawWidth, drawHeight;

                    if (imgAspect > boxAspect) {
                        drawWidth = cardBoxWidth;
                        drawHeight = cardBoxWidth / imgAspect;
                    } else {
                        drawHeight = cardBoxHeight;
                        drawWidth = cardBoxHeight * imgAspect;
                    }

                    const dx = x + (cardBoxWidth - drawWidth) / 2;
                    const dy = y + (cardBoxHeight - drawHeight) / 2;

                    ctx.drawImage(item.img, dx, dy, drawWidth, drawHeight);
                } else {
                    ctx.fillStyle = '#333';
                    ctx.fillRect(x, y, cardBoxWidth, cardBoxHeight);
                }

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 22px sans-serif';
                ctx.fillText(`x${item.seed.count}`, x + (cardBoxWidth / 2), y + cardBoxHeight + 28);
            });

            // 7. Draw Watermark
            ctx.textAlign = 'right';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText('Created at pvzhvault.com', canvasWidth - padding, canvasHeight - 20);

            // 8. Instantly Export & Download
            const link = document.createElement('a');
            const safeTitle = mainTitleText.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.download = `${safeTitle || 'deck'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            btn.innerText = "Downloaded!";
            btn.style.background = "#4CAF50"; 
        } catch (err) {
            console.error("Canvas generation failed: ", err);
            btn.innerText = "Error";
            btn.style.background = "#f44336";
        } finally {
            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.background = ""; 
                btn.disabled = false;
            }, 2000);
        }
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

gamesBtn.addEventListener('click', () => { // <-- NEW
    window.location.hash = 'games';
});

synergyBtn.addEventListener('click', () => {
    window.location.hash = 'synergy';
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
const suggestionsBox = document.getElementById('silhouetteSuggestions');

// 3. State Management variables
const savedDate = localStorage.getItem('silhouetteDate');
const isSolved = localStorage.getItem('silhouetteSolved') === 'true';
let wrongGuesses = parseInt(localStorage.getItem('silhouetteGuesses') || '0');

if (savedDate !== dateString) {
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
function setupUnsolvedState() {
    inputArea.style.display = 'block';
    feedbackEl.textContent = '';
    updateImageBlur(); // Dynamically sets blur based on previous wrong guesses
}

function setupSolvedState() {
    canvas.style.filter = 'blur(0px) grayscale(0%)';
    inputArea.style.display = 'none';
    feedbackEl.textContent = `You got it! It was ${dailyCard.Name.replace(/_/g, ' ')}!`;
    feedbackEl.style.color = '#4CAF50';
}

// --- NEW: Progressive Blur Logic ---
function updateImageBlur() {
    // Starts at 20px blur. Drops by 3px per wrong guess. 
    // Math.max ensures it never drops below 4px until they actually solve it.
    const currentBlur = Math.max(4, 20 - (wrongGuesses * 3));
    canvas.style.filter = `blur(${currentBlur}px) grayscale(100%)`;
}

// --- Autocomplete Logic ---
let selectedRawName = null; 

guessInput.addEventListener('input', function() {
    const query = this.value.toLowerCase().trim();
    suggestionsBox.innerHTML = ''; 
    selectedRawName = null; 

    if (query.length < 2) {
        suggestionsBox.style.display = 'none';
        return;
    }

    let matches = 0;
    Object.keys(cardDatabase).forEach(rawName => {
        if (matches >= 2) return; 
        
        const cleanName = rawName.replace(/_/g, ' ');
        if (cleanName.toLowerCase().includes(query)) {
            const cardInfo = cardDatabase[rawName];
            
            const li = document.createElement('li');
            li.innerHTML = `<span>${cleanName}</span> <span class="suggestion-class">${cardInfo.Class}</span>`;
            
            li.onclick = () => {
                guessInput.value = cleanName;
                selectedRawName = rawName; 
                suggestionsBox.style.display = 'none';
                newSubmitBtn.click(); 
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
        
        feedbackEl.textContent = "Incorrect. The image is now a bit clearer!";
        feedbackEl.style.color = '#f44336';
        
        updateImageBlur(); // Apply the new blur value
        guessInput.value = '';
        guessInput.focus();
    }
});

// --- Image Loading ---
const imgObj = new Image();

imgObj.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / imgObj.width, canvas.height / imgObj.height);
    const x = (canvas.width / 2) - (imgObj.width / 2) * scale;
    const y = (canvas.height / 2) - (imgObj.height / 2) * scale;
    ctx.drawImage(imgObj, x, y, imgObj.width * scale, imgObj.height * scale);
};

imgObj.onerror = function() {
    this.onerror = null; 
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

// Keep a global reference to the graph so we don't recreate it every time they click the tab
let currentSynergyGraph = null;

async function renderSynergyWeb() {
    const container = document.getElementById('synergyCanvasContainer');
    const overlay = document.getElementById('synergyLoadingOverlay');
    const progressBar = document.getElementById('synergyProgressBar');
    const progressText = document.getElementById('synergyLoadingText');
    
    if (!container || currentSynergyGraph) return;

    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'all';

    // Step 1: Crunch the data (Wait a frame so UI updates)
    await new Promise(r => setTimeout(r, 50)); 
    const graphData = buildSynergyData();

    // Step 2: Preload all required images for a flawless reveal
    progressText.innerText = `Loading ${graphData.nodes.length} Cards...`;
    let loadedCount = 0;

    const preloadImage = (node) => {
        return new Promise((resolve) => {
            const img = new Image();
            const formattedName = node.id.replaceAll(' ', '_');
            
            // 1. If it loads successfully (whether PNG or WEBP), attach it and resolve
            img.onload = () => {
                node.img = img;
                resolve();
            };
            
            // 2. If it fails, check what failed
            img.onerror = () => {
                // If the PNG failed, let's try the WEBP!
                // We overwrite the onerror so if the WEBP *also* fails, it just gives up and resolves (preventing a frozen loading bar)
                img.onerror = () => {
                    console.warn(`Missing image for: ${node.id}`);
                    resolve(); 
                };
                
                // Swap the source to WEBP
                img.src = `card_images/${formattedName}.webp`;
            };
            
            // 3. Kick off the loading process by assuming it's a PNG first
            img.src = `card_images/${formattedName}.png`;
        });
    };

    // Load images in parallel chunks to speed it up while updating the bar
    const batchSize = 20;
    for (let i = 0; i < graphData.nodes.length; i += batchSize) {
        const batch = graphData.nodes.slice(i, i + batchSize);
        await Promise.all(batch.map(preloadImage));
        
        loadedCount += batch.length;
        const percent = Math.min(100, Math.round((loadedCount / graphData.nodes.length) * 100));
        progressBar.style.width = `${percent}%`;
    }

    // Step 3: Fade out loading screen
    progressText.innerText = "Weaving the Web...";
    setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.style.display = 'none', 500); // Hide completely
    }, 400);
    // Keep track of the highlighted neighborhood
    let activeNode = null;
    const highlightNodes = new Set();
    const highlightLinks = new Set();
    // Step 4: Render the stunning Force-Graph
    currentSynergyGraph = ForceGraph()(container)
        .graphData(graphData)
        .backgroundColor('#0f172a')
        .nodeId('id')
        // 1. Dynamic Link Styling
        .linkColor(link => {
            if (activeNode) {
                // If in focus mode, highlight active links in bright green, hide the rest
                return highlightLinks.has(link) ? 'rgba(76, 175, 80, 0.8)' : 'rgba(180, 200, 255, 0.02)';
            }
            // Default icy blue galaxy look
            return `rgba(180, 200, 255, ${Math.min(0.6, link.weight / 25)})`;
        })
        .linkWidth(link => {
            if (activeNode) {
                return highlightLinks.has(link) ? Math.min(5, Math.max(2, link.weight / 10)) : 0.5;
            }
            return Math.min(3, Math.max(0.5, link.weight / 15));
        })

        // 2. THE SPECTACULAR EFFECT: Glowing Energy Particles
        .linkDirectionalParticles(link => highlightLinks.has(link) ? 4 : 0) // Only animate active links
        .linkDirectionalParticleWidth(4)
        .linkDirectionalParticleColor(() => '#a7f3d0') // Pale green energy
        .linkDirectionalParticleSpeed(0.006)

        // 3. Interactions: The Camera Swoop & Focus State
        .onNodeClick(node => {
            // If they click the same node again, turn off focus mode
            if (activeNode === node) {
                activeNode = null;
                highlightNodes.clear();
                highlightLinks.clear();
                return;
            }

            // Set the new active node and find its neighborhood
            activeNode = node;
            highlightNodes.clear();
            highlightLinks.clear();
            highlightNodes.add(node);
            
            graphData.links.forEach(link => {
                if (link.source.id === node.id || link.target.id === node.id) {
                    highlightLinks.add(link);
                    highlightNodes.add(link.source);
                    highlightNodes.add(link.target);
                }
            });

            // Smoothly fly the camera to the tapped card
            currentSynergyGraph.centerAt(node.x, node.y, 800); // 800ms pan
            currentSynergyGraph.zoom(1.8, 800); // Zoom in closer
        })
        .onBackgroundClick(() => {
            // Clicking empty space resets the view
            activeNode = null;
            highlightNodes.clear();
            highlightLinks.clear();
        })
        
        // Physics Setup
        .d3Force('charge', d3.forceManyBody().strength(-200)) 
        .d3Force('link', d3.forceLink().distance(80).id(d => d.id)) 
        .d3Force('center', d3.forceCenter())
        .d3Force('x', d3.forceX(0).strength(0.05)) 
        .d3Force('y', d3.forceY(0).strength(0.05)) 
        .d3Force('collide', d3.forceCollide(node => {
            return Math.max(20, Math.min(50, node.popularity / 3)) + 5; 
        }).iterations(2))

        // 4. Update Node Rendering to Handle Fading
        .nodeCanvasObject((node, ctx, globalScale) => {
            const baseSize = Math.max(20, Math.min(50, node.popularity / 3));
            
            // Check if we should dim this card
            const isFaded = activeNode && !highlightNodes.has(node);

            ctx.save();
            
            // Fade out cards that aren't connected to the active node
            ctx.globalAlpha = isFaded ? 0.15 : 1; 

            if (node.img && node.img.complete && node.img.naturalHeight !== 0) {
                
                // Keep the stunning shadows
                ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
                ctx.shadowBlur = 12;
                ctx.shadowOffsetX = 3;
                ctx.shadowOffsetY = 6;

                // If this is the specifically clicked node, give it an extra glowing aura!
                if (node === activeNode) {
                    ctx.shadowColor = '#4CAF50';
                    ctx.shadowBlur = 25;
                }

                const imgAspect = node.img.naturalWidth / node.img.naturalHeight;
                let drawWidth = baseSize * 2; 
                let drawHeight = baseSize * 2;
                
                if (imgAspect > 1) { 
                    drawHeight = drawWidth / imgAspect;
                } else { 
                    drawWidth = drawHeight * imgAspect;
                }

                ctx.drawImage(
                    node.img, 
                    node.x - (drawWidth / 2), 
                    node.y - (drawHeight / 2), 
                    drawWidth, 
                    drawHeight
                );

            } else {
                ctx.fillStyle = '#334155'; 
                ctx.fillRect(node.x - baseSize, node.y - baseSize * 1.4, baseSize * 2, baseSize * 2.8);
            }
            
            ctx.restore();
        })
        .nodePointerAreaPaint((node, color, ctx) => {
            const baseSize = Math.max(20, Math.min(50, node.popularity / 3));
            
            // Create a clickable rectangle that roughly matches the card dimensions
            const hitWidth = baseSize * 2.2;
            const hitHeight = baseSize * 2.8; 
            
            ctx.fillStyle = color; // The engine passes a unique hidden color to track clicks
            
            // Draw the invisible clickable box perfectly over the image
            ctx.fillRect(
                node.x - (hitWidth / 2), 
                node.y - (hitHeight / 2), 
                hitWidth, 
                hitHeight
            );
        })
}

// --- Sync Data Cruncher ---
function buildSynergyData() {
    const nodesMap = new Map();
    const edgesMap = new Map();

    for (const key in fullDatabase) {
        const deck = fullDatabase[key];
        if (!deck.cards || !Array.isArray(deck.cards)) continue;

        const deckCards = deck.cards.map(c => c.replace(/^x\d+\s+/, '').trim().replaceAll('_', ' '));

        deckCards.forEach(card => {
            if (!nodesMap.has(card)) {
                nodesMap.set(card, { id: card, popularity: 1 });
            } else {
                nodesMap.get(card).popularity += 1;
            }
        });

        for (let i = 0; i < deckCards.length; i++) {
            for (let j = i + 1; j < deckCards.length; j++) {
                const pair = [deckCards[i], deckCards[j]].sort();
                const edgeId = `${pair[0]}|||${pair[1]}`;

                if (!edgesMap.has(edgeId)) {
                    edgesMap.set(edgeId, { source: pair[0], target: pair[1], weight: 1 });
                } else {
                    edgesMap.get(edgeId).weight += 1;
                }
            }
        }
    }

    const MIN_SYNERGY_WEIGHT = 10; 
    const links = Array.from(edgesMap.values()).filter(e => e.weight >= MIN_SYNERGY_WEIGHT);
    
    const connectedNodes = new Set();
    links.forEach(link => {
        connectedNodes.add(link.source);
        connectedNodes.add(link.target);
    });
    const nodes = Array.from(nodesMap.values()).filter(n => connectedNodes.has(n.id));

    return { nodes, links };
}