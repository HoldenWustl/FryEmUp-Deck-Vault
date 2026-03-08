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
    
    // --- NEW: Pay-to-Win Tracking Variables ---
    let maxSparkCost = -1;
    let minSparkCost = Infinity;
    let mostExpensiveDeck = null; 
    let leastExpensiveDeck = null;
    
    // --- NEW: Average Deck Formula Trackers ---
    let earlyGameTotal = 0; // Cost 0-2
    let midGameTotal = 0;   // Cost 3-5
    let lateGameTotal = 0;  // Cost 6+
    let validDeckCountForCurve = 0;

    let totalUniqueCardSlots = 0;
     
    // --- NEW: Trending Data Variables ---
    const RECENT_DECK_COUNT = 50; 
    const recentCardFreq = {};

    // --- FIX: Safely sort allDecks from newest to oldest ---
    // --- FIX: Safely sort allDecks from newest to oldest ---
    let allDecks = Object.values(fullDatabase).sort((a, b) => {
        const dateA = a.upload_date && a.upload_date !== "UNKNOWN_DATE" ? new Date(a.upload_date).getTime() : 0;
        const dateB = b.upload_date && b.upload_date !== "UNKNOWN_DATE" ? new Date(b.upload_date).getTime() : 0;
        return dateB - dateA; 
    });

    // --- NEW: Apply the timeframe filter! ---
    if (limit !== 'all') {
        const sliceAmount = parseInt(limit, 10);
        // Since newest are at the front (index 0), we grab from 0 up to the sliceAmount
        allDecks = allDecks.slice(0, sliceAmount);
    }

    const totalDecks = allDecks.length;

    // Process the database
    allDecks.forEach((deck, index) => {
        let uniqueInThisDeck = 0;
        const deckCardNames = []; 
        let currentDeckSparkCost = 0;

        // 1. Process Timeline
        if (deck.upload_date && deck.upload_date !== "UNKNOWN_DATE") {
            const yearMatch = deck.upload_date.match(/\b(20\d{2})\b/);
            if (yearMatch) {
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
                        costCurve[info.Cost] = (costCurve[info.Cost] || 0) + count;
                        if (info.Cost <= 2) earlyGameTotal += count;
                        else if (info.Cost <= 5) midGameTotal += count;
                        else lateGameTotal += count;
                    }
                    if (info.Class) {
                        classCounts[info.Class] = (classCounts[info.Class] || 0) + count;
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
                        for(let i=0; i < count; i++) {
                            statsByCost[info.Cost].str.push(info.Strength);
                            statsByCost[info.Cost].hp.push(info.Health);
                        }
                    }
                }
            }
        });
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

        // 4. Calculate Synergies
        for (let i = 0; i < deckCardNames.length; i++) {
            for (let j = i + 1; j < deckCardNames.length; j++) {
                const pair = [deckCardNames[i], deckCardNames[j]].sort();
                const pairStr = `${pair[0]} + ${pair[1]}`;
                pairCounts[pairStr] = (pairCounts[pairStr] || 0) + 1;
            }
        }

        if (currentDeckSparkCost > 0) validDeckCountForCurve++;
    });

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
    }

    // Prepare Data for Charts 
    const topCopied = Object.entries(cardCopies).sort((a, b) => b[1] - a[1]);
    const topCopiedSliced = topCopied.slice(0, 15);
    const topPresence = Object.entries(deckPresence).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const yearsSorted = Object.keys(uploadsByYear).sort();
    const topPairs = Object.entries(pairCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const topWords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const costsSorted = Object.keys(costCurve).sort((a, b) => parseInt(a) - parseInt(b));

    // Destroy existing charts
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
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
                    const clickedCard = topCopiedSliced[activeElements[0].index][0];
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
        data: { labels: topPairs.map(i => i[0]), datasets: [{ data: topPairs.map(i => i[1]), backgroundColor: '#8957e5', borderRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { grid: { color: gridColor }, ticks: { color: textColor } }, y: { ticks: { color: '#c9d1d9', font: { size: 10 } }, grid: { display: false } } }, plugins: { legend: { display: false } } }
    });

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
                                label: function(context) {
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
    charts.classDominance = new Chart(ctx7, {
        type: 'radar',
        data: {
            labels: Object.keys(classCounts),
            datasets: [{ label: 'Total Copies Across Decks', data: Object.values(classCounts), backgroundColor: 'rgba(210, 168, 255, 0.4)', borderColor: '#d2a8ff', pointBackgroundColor: '#a371f7', borderWidth: 2 }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { r: { grid: { color: gridColor }, angleLines: { color: gridColor }, ticks: { display: false }, pointLabels: { color: '#c9d1d9', font: { size: 12 } } } }, plugins: { legend: { display: false } } }
    });

   // --- CHART 8: Rarity Breakdown ---
    const ctx8 = document.getElementById('rarityChart').getContext('2d');
    const canvasWidth = ctx8.canvas.clientWidth || 400; 
    const canvasHeight = ctx8.canvas.clientHeight || 400; 

    const sliceGradient = ctx8.createLinearGradient(0, 0, canvasWidth, canvasHeight); 
    sliceGradient.addColorStop(0, '#4b00c4');  
    sliceGradient.addColorStop(0.3, '#df00ff');
    sliceGradient.addColorStop(0.5, '#ff5900'); 
    sliceGradient.addColorStop(0.75, '#ffcc00');
    sliceGradient.addColorStop(1, '#bfff00');  

    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 40;  
    patternCanvas.height = 15; 
    const pCtx = patternCanvas.getContext('2d');
    
    const pGradient = pCtx.createLinearGradient(0, 0, 40, 0); 
    pGradient.addColorStop(0, '#4b00c4');    
    pGradient.addColorStop(0.3, '#df00ff'); 
    pGradient.addColorStop(0.5, '#ff5900');  
    pGradient.addColorStop(0.75, '#ffcc00'); 
    pGradient.addColorStop(1, '#bfff00');    
    pCtx.fillStyle = pGradient;
    pCtx.fillRect(0, 0, 40, 15);
    const legendPattern = ctx8.createPattern(patternCanvas, 'repeat');

    const getRarityWeight = (r) => {
        const lower = r.toLowerCase();
        if (lower.includes('common') && !lower.includes('uncommon')) return 1;
        if (lower.includes('uncommon')) return 2;
        if (lower.includes('super')) return 4; 
        if (lower.includes('rare')) return 3;
        if (lower.includes('legendary')) return 5;
        if (lower.includes('event')) return 6;
        return 99; 
    };

    const sortedRarityLabels = Object.keys(rarityCounts).sort((a, b) => getRarityWeight(a) - getRarityWeight(b));
    const sortedRarityData = sortedRarityLabels.map(label => rarityCounts[label]);
    const sortedRarityColors = sortedRarityLabels.map(r => {
        const lower = r.toLowerCase();
        if (lower.includes('uncommon')) return '#a1aab5'; 
        if (lower.includes('common')) return '#f8fafd';   
        if (lower.includes('super')) return '#6B21A8'; 
        if (lower.includes('rare')) return '#d29922'; 
        if (lower.includes('legendary')) return sliceGradient; 
        if (lower.includes('event')) return '#FF4500'; 
        return '#ffffff';
    });

    charts.rarity = new Chart(ctx8, {
        type: 'polarArea', 
        data: { 
            labels: sortedRarityLabels,       
            datasets: [{ 
                data: sortedRarityData,       
                backgroundColor: sortedRarityColors, 
                borderColor: '#161b22', 
                borderWidth: 2,
                hoverOffset: 6 
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { 
                legend: { 
                    position: 'right', 
                    labels: { 
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const meta = chart.getDatasetMeta(0);
                                    let fill = data.datasets[0].backgroundColor[i];
                                    if (label.toLowerCase().includes('legendary')) fill = legendPattern;
                                    return {
                                        text: label,
                                        fillStyle: fill,
                                        strokeStyle: data.datasets[0].borderColor,
                                        lineWidth: data.datasets[0].borderWidth,
                                        fontColor: '#c9d1d9',
                                        hidden: isNaN(data.datasets[0].data[i]) || meta.data[i].hidden,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    } 
                } 
            },
            scales: { r: { ticks: { display: false }, grid: { color: '#30363d' } } }
        }
    });

    // --- CHART 9: Average Deck Formula ---
    const avgEarly = validDeckCountForCurve ? (earlyGameTotal / validDeckCountForCurve).toFixed(1) : 0;
    const avgMid = validDeckCountForCurve ? (midGameTotal / validDeckCountForCurve).toFixed(1) : 0;
    const avgLate = validDeckCountForCurve ? (lateGameTotal / validDeckCountForCurve).toFixed(1) : 0;

    const ctx9 = document.getElementById('averageDeckChart').getContext('2d');
    charts.averageDeck = new Chart(ctx9, {
        type: 'doughnut',
        data: {
            labels: ['Early Game (0-2)', 'Mid Game (3-5)', 'Late Game (6+)'],
            datasets: [{
                data: [avgEarly, avgMid, avgLate],
                backgroundColor: ['#3fb950', '#d29922', '#f85149'],
                borderColor: '#161b22', borderWidth: 2, hoverOffset: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#c9d1d9' } },
                tooltip: { callbacks: { label: function(context) { return ` ${context.raw} cards per deck`; } } }
            }
        }
    });
}


});
