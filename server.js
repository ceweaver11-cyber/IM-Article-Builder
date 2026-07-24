const express = require('express');
const cors = require('cors');
const { Anthropic } = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// GitHub repository details
const GITHUB_REPO = 'ceweaver11-cyber/IM-Article-Builder';
const FILE_PATH = 'articles.json';

// Updated Master List of Key Cities & Regions across France and Switzerland
const LOCATION_POOL = [
  // --- FRANCE ---
  // Greater Paris (Île-de-France)
  "Greater Paris (Île-de-France)", "Paris 1st–4th (Historic Center)", "Paris 6th (Saint-Germain)", "Paris 7th/8th (Eiffel/CBD)", "Paris 9th/10th (Tech/Gentrification)", "Paris 11th (Density/Rentals)", "Paris 15th/16th (Prime Residential)",
  "Neuilly-sur-Seine", "Boulogne-Billancourt", "Levallois-Perret", "Issy-les-Moulineaux", "La Défense (Puteaux/Courbevoie)", "Versailles",
  "Saint-Ouen", "Montreuil", "Pantin", "Vincennes", "Saint-Denis",

  // French Riviera & Provence (PACA)
  "Nice", "Cannes", "Saint-Tropez", "Antibes & Cap d'Antibes", "Saint-Jean-Cap-Ferrat", "Villefranche-sur-Mer",
  "Marseille", "Aix-en-Provence", "Avignon", "Toulon",

  // French Alps (Mont-Blanc & Tarentaise)
  "Courchevel", "Val d'Isère", "Méribel", "Megève", "Chamonix-Mont-Blanc", "Morzine", "Val Thorens",

  // Auvergne-Rhône-Alpes & French-Geneva Border
  "Lyon (Presqu'île, 6th Arr., Part-Dieu)", "Villeurbanne",
  "Annecy (Lakefront)", "Grenoble", "Saint-Étienne",
  "Annemasse", "Ferney-Voltaire", "Saint-Julien-en-Genevois", "Évian-les-Bains", "Divonne-les-Bains",

  // Atlantic Coast & South West
  "Bordeaux", "Mérignac",
  "Biarritz", "Saint-Jean-de-Luz", "Bayonne", "Arcachon & Cap Ferret", "La Rochelle",
  "Toulouse", "Montpellier",

  // Grand Est, North & Western France
  "Strasbourg", "Mulhouse", "Reims", "Colmar",
  "Lille", "Nantes", "Rennes", "Angers", "Le Touquet",

  // --- SWITZERLAND ---
  // Lake Geneva Region (Arc Lémanique)
  "Geneva City (Cité-Centre, Plainpalais, Eaux-Vives)", "Cologny", "Carouge", "Lancy (Pont-Rouge CBD)", "Meyrin",
  "Lausanne (Ouchy, EPFL hub)", "Montreux", "Vevey", "Nyon", "Morges", "Lutry",

  // Greater Zurich & Low-Tax Hubs
  "Zurich City (Enge, Seefeld, Zurich West)", "Küsnacht (\"Gold Coast\")", "Zollikon", "Winterthur", "Oerlikon/Wallisellen",
  "Zug City", "Baar",

  // Central Switzerland
  "Lucerne City", "Meggen", "Wollerau / Freienbach", "Weggis / Vitznau",

  // Northwestern Switzerland (Basel & Pharma Hub)
  "Basel City", "Riehen", "Allschwil", "Binningen",
  "Baden", "Olten",

  // Capital & Western Switzerland
  "Bern City", "Thun", "Fribourg City", "Neuchâtel", "Biel/Bienne",

  // Swiss Alpine & Resort Real Estate
  "Zermatt", "Verbier", "Crans-Montana", "Sion", "Visp",
  "St. Moritz (Engadin)", "Davos", "Klosters",

  // Canton Ticino & St. Gallen
  "Lugano", "Locarno", "Ascona",
  "St. Gallen City"
];

/**
 * Helper function: Get array of N randomly selected cities/regions
 */
function getRandomLocations(count = 2) {
    const shuffled = [...LOCATION_POOL].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

/**
 * Helper function: Fetch articles directly from GitHub
 */
async function getArticlesFromGitHub() {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!response.ok) {
        if (response.status === 404) return { sha: null, content: [] };
        throw new Error(`GitHub fetch error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return { sha: data.sha, content: JSON.parse(content) };
}

/**
 * Helper function: Save updated articles directly to GitHub
 */
async function saveArticlesToGitHub(updatedArticles, sha) {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`;
    const contentEncoded = Buffer.from(JSON.stringify(updatedArticles, null, 2)).toString('base64');

    const body = {
        message: 'automation: publish daily generated articles',
        content: contentEncoded,
        ...(sha && { sha })
    };

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`GitHub save error: ${response.statusText}`);
    }
}

/**
 * Dual-Agent AI Writer Execution Engine (2 Long Articles per Batch)
 */
async function generateDailyArticles() {
    const selectedLocations = getRandomLocations(2);
    console.log(`[Automation Triggered] Selected locations for this run: ${selectedLocations.join(', ')}`);

    const prompt = `You are a dual-agent AI workspace designed for Milestone Investment Management (Milestone IM). You operate as two distinct entities sequentially: the "Senior Investment Strategist & Writer" and the "Rigorous Quality Reviewer."

### YOUR VOICE & BRAND DNA:
Your writing tone is inspired by "Les Secrets de l'Immo" but modernized: natural, conversational, and direct. Write sharp, high-interest titles targeting Family Offices, SCPIs, Investment Funds, Real Estate Professionals, and Wealth Advisors.

### MANDATORY LOCATION FOCUS FOR THIS BATCH:
Generate exactly 2 comprehensive, long-form articles. Each article MUST focus strictly on one of these 2 locations:
${selectedLocations.map((loc, index) => `${index + 1}.${loc}`).join('\n')}

### THE WRITING RULES FOR LONG-FORM ARTICLES:
1. DEPTH & LENGTH: Write detailed, multi-section articles (~600–900 words each). Provide granular breakdowns of real estate fundamentals, yield spreads, capital markets, and local demographic trends.
2. TIMELINESS: Ground all macroeconomic and property metrics strictly in recent data (2023–2026 window).
3. FACTUAL VERIFIABILITY: Include specific metrics (e.g., prime office/logistics cap rates, vacancy percentages, indexation rates, LTV constraints).
4. NO DIRECT QUOTES & NO CITATIONS: Never cite authors or reference book titles directly.
5. MANDATORY SOURCES: Every article must include 2-3 credible institutional sources at the end.
6. LANGUAGE: Impeccable, highly natural French.

### OUTPUT FORMAT REQUIREMENT:
Generate exactly 2 long-form articles matching the locations above. Return your complete output strictly as a raw JSON array of objects without markdown block formatting or intro text:

[
  {
    "title": "Title in French",
    "region": "Selected Location Name",
    "content": "Comprehensive paragraph 1\\n\\nComprehensive paragraph 2...",
    "sources": "Source 1, Source 2"
  }
]`;

    try {
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-5',
            max_tokens: 8192,
            system: "You are an expert real estate data parser and copywriter. You only output valid raw JSON arrays without markdown block syntax, triple backticks, or intro text.",
            messages: [{ role: 'user', content: prompt }]
        });

        const textBlock = response.content?.find(block => block.type === 'text') || response.content?.[0];
        let rawContent = (textBlock?.text || '').trim();

        // Strip backticks or markdown codeblock syntax if present
        rawContent = rawContent.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/g, '').trim();

        let newArticles;
        try {
            newArticles = JSON.parse(rawContent);
        } catch (jsonErr) {
            console.error("[JSON Parse Failure] Output was malformed. String snippet end:", rawContent.slice(-150));
            return;
        }

        if (Array.isArray(newArticles)) {
            const { sha, content: currentData } = await getArticlesFromGitHub();
            
            const formattedArticles = newArticles.map(art => ({
                id: Date.now() + Math.random().toString(36).substr(2, 5),
                title: art.title,
                region: art.region,
                isoDate: new Date().toISOString().split('T')[0],
                content: art.content,
                sources: art.sources
            }));

            const updatedData = [...formattedArticles, ...currentData];
            await saveArticlesToGitHub(updatedData, sha);
            console.log('[Success] 2 long-form articles written to GitHub articles.json safely.');
        }
    } catch (error) {
        console.error('[Error Run-Time Pipeline Failure]:', error);
    }
}

// Lightweight health-check endpoint to keep Render awake
app.get('/ping', (req, res) => {
    res.status(200).send('Server is awake!');
});

// GET endpoint for frontend UI
app.get('/api/articles', async (req, res) => {
    try {
        const { content } = await getArticlesFromGitHub();
        res.json(content);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch database record from GitHub." });
    }
});

// Manual trigger route for external cron-job
app.post('/api/trigger-generation', (req, res) => {
    const cronSecret = req.headers['x-cron-secret'];
    
    if (cronSecret !== "MilestoneIM2026SecurePass") {
        return res.status(401).json({ error: "Unauthorized: Missing or invalid security token header." });
    }

    res.json({ message: "Generation protocol initiated successfully in the background." });

    generateDailyArticles().catch(err => {
        console.error("[Background Error] Daily article generation failed:", err);
    });
});

app.listen(PORT, () => {
    console.log(`Milestone IM Platform Online: http://localhost:${PORT}`);
});
