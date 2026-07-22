/**
 * "Every Feeling Has a Meaning" - Application Control Engine
 * Updated: Forces complete, unabridged quotes, avoids duplicates, and excludes celestial terms.
 */

// 1. State Configuration & History Tracking
const moodKeywords = {
    full: ["existential truth", "clarity", "wholeness", "human nature", "cosmic perspective", "absurdism"],
    crescent: ["solitude", "melancholy", "quiet longing", "introspection", "grief", "poetic silence"]
};

let selectedMoon = 'full';
let activeCategory = 'All';
let inputMode = 'feeling'; 

// In-memory array to track generated quotes during the current session to avoid direct duplicates
const generatedQuoteHistory = [];

$(document).ready(function() {

    // 2. Screen Transitions: Gateway to Dashboard
    $('.moon-card').on('click', function() {
        selectedMoon = $(this).data('moon');
        
        $('#gateway-section').fadeOut(500, function() {
            $('#dashboard-section').removeClass('d-none').addClass('fade-in-element').fadeIn(500);
            generateLiveAIQuote(); 
        });
    });

    // Screen Transitions: Return to Gateway
    $('#back-to-moons').on('click', function() {
        $('#dashboard-section').fadeOut(500, function() {
            $('#gateway-section').fadeIn(500);
        });
    });

    // 3. Input Mode Toggle (Feeling Mode vs. Cinema Philosophy Mode)
    $(document).on('click', '#toggle-movie-mode', function() {
        if(inputMode === 'feeling') {
            inputMode = 'movie';
            $(this).text('📖 Switch to Feeling Mode');
            $('#grok-feeling-input').attr('placeholder', 'e.g., Interstellar, Good Will Hunting, Fight Club...');
            $('.grok-input-section h5').text('Evoke cinema philosophy...');
        } else {
            inputMode = 'feeling';
            $(this).text('🎬 Switch to Movie Mode');
            $('#grok-feeling-input').attr('placeholder', 'e.g., I feel like a ghost drifting through a crowded room...');
            $('.grok-input-section h5').text('Speak to the night...');
        }
    });

    // 4. Central Live Groq Fetch Engine
    function generateLiveAIQuote(specificInput = null) {
        const apiKey = typeof env !== 'undefined' ? env.GROQ_API_KEY : '';
        
        if (!apiKey || apiKey.includes("YOUR_GROQ")) {
            alert("Please set your Groq API key inside config.js first!");
            return;
        }

        // Show loading element
        $('#grok-loading').removeClass('d-none');

        let systemPrompt = "";
        let requestTemperature = 0.85; 

        // Emotional atmosphere profile without referring to celestial words
        const moodStyle = selectedMoon === 'full' 
            ? "unflinching clarity, realization, deep self-truth, or universal human nature."
            : "quiet solitude, deep introspection, raw vulnerability, or poignant emotional longing.";

        // History exclusion list string for system prompt injection
        const historySnippet = generatedQuoteHistory.length > 0 
            ? `DO NOT repeat any of these previously shown quotes: ${JSON.stringify(generatedQuoteHistory.slice(-10))}.` 
            : "";

        if (specificInput) {
            if (inputMode === 'movie') {
                // Scenario A: User requested a specific film
                requestTemperature = 0.7;
                
                systemPrompt = `You are an expert film archivist and script historian. The user has provided the movie: "${specificInput}".
                CRITICAL DIRECTIVE 1: Provide a FULL, COMPLETE, UNABRIDGED dialogue passage spoken by a character in "${specificInput}". Never truncate, cut off half-way, or output partial fragments.
                CRITICAL DIRECTIVE 2: Select a DIFFERENT, distinct quote each time this movie is requested.
                STRICT NEGATIVE CONSTRAINTS: 
                - DO NOT include celestial words like "moon", "lunar", "star", "stars", "sky", "space", "cosmos", or "crescent" in the quote or author field.
                - DO NOT use moon phase names or astronomical terms.
                ${historySnippet}

                Respond strictly with a raw, valid JSON object containing exactly two string properties: "quote" and "author". Do not use markdown code fences.
                Format: {"quote": "The full, complete spoken dialogue sentence or passage", "author": "Character Name, Movie Title"}`;
            } else {
                // Scenario B: User inputs a custom raw human feeling
                requestTemperature = 0.75; 
                
                systemPrompt = `You are a library of human emotion and literature. The user is expressing this feeling: "${specificInput}".
                CRITICAL DIRECTIVE 1: Retrieve a FULL, COMPLETE, UNABRIDGED quote by a real historical author, psychologist, philosopher, or poet that resonates with this specific emotional nuance. Never truncate or output partial quotes.
                CRITICAL DIRECTIVE 2: Vary your selection — do not always output the most famous quote. Pick deep, insightful alternatives.
                STRICT NEGATIVE CONSTRAINTS:
                - DO NOT explicitly reuse the exact emotion word "${specificInput}" inside the quote body.
                - DO NOT include words like "moon", "full moon", "crescent", "lunar", "star", "stars", "sky", "space", or "cosmos".
                ${historySnippet}

                Respond strictly with a raw, valid JSON object containing exactly two string properties: "quote" and "author". Do not use markdown code fences.
                Format: {"quote": "The full and complete quote text", "author": "Author Name"}`;
            }
        } else {
            // Scenario C: Category browsing or random "Another Feeling" click
            const randomKeyword = moodKeywords[selectedMoon][Math.floor(Math.random() * moodKeywords[selectedMoon].length)];
            const contextCategory = activeCategory === 'All' ? randomKeyword : activeCategory;
            requestTemperature = 0.85;

            systemPrompt = `You are a curator of human emotional history. Find a FULL, COMPLETE, UNABRIDGED quote by a recognized thinker or writer (such as Nietzsche, Camus, Dostoevsky, Kafka, Woolf, Cioran, Baldwin, Rilke, etc.) that articulates the emotional core of "${contextCategory}". Never truncate or cut off the quote.
            The overall tone should align with: ${moodStyle}
            STRICT NEGATIVE CONSTRAINTS:
            - DO NOT include the words "${contextCategory}", "moon", "full moon", "crescent", "lunar", "star", "stars", "sky", or "cosmos" in the quote text.
            ${historySnippet}

            Respond strictly with a raw, valid JSON object containing exactly two string properties: "quote" and "author". Do not use markdown code fences.
            Format: {"quote": "The full historical quote text", "author": "Author Name"}`;
        }

        // Make live post request to Groq API systems
        fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                response_format: { type: "json_object" }, 
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Evoke a full, complete, unique quote reflecting this experience (Seed: ${Math.random()}).` }
                ],
                max_tokens: 300, // Raised token boundary so long quotes are never truncated mid-sentence
                temperature: requestTemperature
            })
        })
        .then(response => {
            if (!response.ok) throw new Error(`API Error: Status ${response.status}`);
            return response.json();
        })
        .then(data => {
            $('#grok-loading').addClass('d-none');
            
            if (data && data.choices && data.choices[0] && data.choices[0].message) {
                try {
                    const rawContent = data.choices[0].message.content.trim();
                    const quoteObj = JSON.parse(rawContent);
                    
                    if (quoteObj && quoteObj.quote) {
                        // Store the generated quote in active session history
                        generatedQuoteHistory.push(quoteObj.quote);

                        // Smoothly swap quote out using standard cross-fading
                        $("#quote-text").fadeOut(200, function() { $(this).text(`"${quoteObj.quote}"`).fadeIn(300); });
                        $("#quote-author").fadeOut(200, function() { $(this).text(`— ${quoteObj.author || 'Unknown Origin'}`).fadeIn(300); });
                    }
                } catch (parseError) {
                    console.error("JSON parse error:", parseError);
                    $("#quote-text").text("The dynamic script lookup shifted. Click another reflection to realign.");
                }
            }
        })
        .catch(error => {
            $('#grok-loading').addClass('d-none');
            console.error("Network error:", error);
            alert("The connection to the engine was interrupted. Please check your config.js file.");
        });
    }

    // 5. Interface Action Interactions
    $('#next-quote-btn').on('click', function() {
        const userInput = $('#grok-feeling-input').val().trim();
        if (userInput) {
            generateLiveAIQuote(userInput);
        } else {
            generateLiveAIQuote(); 
        }
    });

    $('.cat-btn').on('click', function() {
        $('.cat-btn').removeClass('active');
        $(this).addClass('active');
        activeCategory = $(this).data('category');
        $('#grok-feeling-input').val(''); 
        generateLiveAIQuote(); 
    });
    
    $('#grok-submit-btn').on('click', function() {
        const userInput = $('#grok-feeling-input').val().trim();
        if(!userInput) return;
        
        generateLiveAIQuote(userInput);
    });

    $('#grok-feeling-input').on('keypress', function(e) {
        if(e.which === 13) { 
            $('#grok-submit-btn').click();
        }
    });

    // 6. Storage Engine: "My Moon Diary"
    $('#save-quote-btn').on('click', function() {
        const text = $('#quote-text').text();
        const author = $('#quote-author').text();

        if(!text || text.includes("The dynamic script lookup")) return;

        let diary = JSON.parse(localStorage.getItem('myMoonDiary')) || [];
        
        if (!diary.some(item => item.text === text)) {
            diary.push({ text, author, timestamp: new Date().toLocaleDateString() });
            localStorage.setItem('myMoonDiary', JSON.stringify(diary));
            
            const origText = $(this).text();
            $(this).text('✓ Saved').addClass('text-success');
            setTimeout(() => { $(this).text(origText).removeClass('text-success'); }, 1500);
        }
    });

    // Swap workspace panel context out for diary view
    $('#view-diary-btn').on('click', function() {
        $('#dashboard-section').fadeOut(400, function() {
            $('#diary-section').removeClass('d-none').fadeIn(400);
            renderDiaryItems();
        });
    });

    // Return safely to dashboard panel
    $('#close-diary-btn').on('click', function() {
        $('#diary-section').fadeOut(400, function() {
            $('#dashboard-section').fadeIn(400);
        });
    });

    // Map saved data array states dynamically onto DOM ledger list containers
    function renderDiaryItems() {
        const container = $('#diary-container');
        container.empty();
        const diary = JSON.parse(localStorage.getItem('myMoonDiary')) || [];

        if(diary.length === 0) {
            container.html('<p class="text-muted italic py-4">Your diary is empty. No thoughts captured yet.</p>');
            return;
        }

        diary.forEach((item, index) => {
            container.append(`
                <div class="col-md-10">
                    <div class="saved-card position-relative p-4 mb-3">
                        <p class="mb-1 italic fs-5 text-start">${item.text}</p>
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <span class="small text-warning">${item.author}</span>
                            <span class="text-muted small" style="font-size:0.75rem;">Recorded: ${item.timestamp}</span>
                        </div>
                        <button class="btn btn-sm text-danger position-absolute top-0 end-0 m-2 delete-diary-item" data-index="${index}" style="font-size:1.2rem; background:none; border:none;">&times;</button>
                    </div>
                </div>
            `);
        });
    }

    // Dynamic document listener tracking target array element deletes
    $(document).on('click', '.delete-diary-item', function() {
        const index = $(this).data('index');
        let diary = JSON.parse(localStorage.getItem('myMoonDiary')) || [];
        
        diary.splice(index, 1); 
        localStorage.setItem('myMoonDiary', JSON.stringify(diary));
        renderDiaryItems(); 
    });
});