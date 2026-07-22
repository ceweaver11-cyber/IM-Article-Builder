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

// Master List of 500 Cities & Regions across Switzerland and France
const LOCATION_POOL = [
  // Cantons & Key Regions (Switzerland)
  "Zurich Canton", "Bern Canton", "Lucerne Canton", "Uri", "Schwyz", "Obwalden", "Nidwalden", "Glarus", "Zug Canton", "Fribourg Canton", "Solothurn Canton", "Basel-Stadt", "Basel-Landschaft", "Schaffhausen Canton", "Appenzell Ausserrhoden", "Appenzell Innerrhoden", "St. Gallen Canton", "Graubünden", "Aargau", "Thurgau", "Ticino", "Vaud", "Valais", "Neuchâtel Canton", "Geneva (Grand Genève)", "Jura Canton",
  
  // Swiss Cities & Municipalities
  "Geneva", "Lausanne", "Montreux", "Vevey", "Nyon", "Morges", "Renens", "Pully", "Vernier", "Lancy", "Meyrin", "Carouge", "Onex", "Thônex", "Versoix", "Chêne-Bougeries", "Grand-Saconnex", "Yverdon-les-Bains", "Gland", "Rolle", "Aigle", "Payerne", "Lutry", "Echallens", "Villeneuve",
  "Zurich", "Winterthur", "Uster", "Dübendorf", "Dietikon", "Wetzikon", "Kloten", "Horgen", "Wädenswil", "Bülach", "Opfikon", "Schlieren", "Adliswil", "Regensdorf", "Volketswil", "Thalwil", "Stäfa", "Illnau-Effretikon", "Küsnacht", "Meilen",
  "Basel", "Bern", "Lucerne", "Zug", "Biel/Bienne", "Thun", "Köniz", "La Chaux-de-Fonds", "Fribourg", "Schaffhausen", "Chur", "Neuchâtel", "Solothurn", "Olten", "Aarau", "Baden", "Wettingen", "Riehen", "Allschwil", "Emmen", "Kriens", "Baar", "Cham", "Muttenz", "Liestal",
  "St. Gallen", "Lugano", "Bellinzona", "Locarno", "Mendrisio", "Sion", "Sierre", "Martigny", "Monthey", "Wil", "Gossau", "Frauenfeld", "Arbon", "Kreuzlingen", "Rapperswil-Jona", "Herisau", "Davos", "St. Moritz", "Zermatt", "Brig-Glis",

  // Haute-Savoie, Pays de Gex, Savoie, Ain, Doubs & Jura
  "Annecy", "Annemasse", "Thonon-les-Bains", "Évian-les-Bains", "Saint-Julien-en-Genevois", "Ferney-Voltaire", "Gex", "Divonne-les-Bains", "Cluses", "Sallanches", "Chamonix-Mont-Blanc", "Rumilly", "Bonneville", "Gaillard", "Passy", "Megève", "Saint-Gervais-les-Bains", "La Clusaz", "Le Grand-Bornand", "Morzine", "Les Gets", "Châtel", "Cran-Gevrier", "Seynod", "Meythet", "Ambilly", "Ville-la-Grand", "Vetraz-Monthoux", "Cranves-Sales", "Reignier-Ésery", "Douvaine", "Sciez", "Publier", "Neuvecelle", "Lugrin", "Saint-Cergues", "Archamps", "Collonges-sous-Salève", "Neydens", "Beaumont", "Viry", "Vulbens", "Valleiry", "Frangy", "Seyssel", "Thorens-Glières", "Groisy", "Saint-Jorioz", "Sévrier", "Talloires-Montmin", "Faverges-Seythenex", "Doussard", "Fillière", "Pers-Jussy", "Fillinges", "Viuz-en-Sallaz", "Taninges", "Samoëns", "Les Houches", "Servoz",
  "Chambéry", "Aix-les-Bains", "Albertville", "Bourg-en-Bresse", "Oyonnax", "Bellegarde-sur-Valserine", "Belley", "Saint-Genis-Pouilly", "Thoiry", "Prévessin-Moëns", "Ornex", "Cessy", "Saint-Jean-de-Maurienne", "Bourg-Saint-Maurice", "Tignes", "Val-d'Isère", "Courchevel", "Méribel", "Les Allues", "Moûtiers", "La Léchère", "Ugine", "Challes-les-Eaux", "La Motte-Servolex", "Saint-Alban-Leysse", "Cognin", "Montmélian", "Saint-Pierre-d'Albigny", "Gilly-sur-Isère", "Yenne", "Lagnieu", "Ambérieu-en-Bugey", "Meximieux", "Montluel", "Miribel", "Trévoux", "Jassans-Riottier", "Châtillon-sur-Chalaronne", "Villars-les-Dombes", "Besançon", "Pontarlier", "Morteau", "Maîche", "Valdahon", "Baume-les-Dames", "Montbéliard", "Lons-le-Saunier", "Dole", "Saint-Claude", "Champagnole", "Morez", "Les Rousses", "Poligny", "Arbois", "Salins-les-Bains", "Saint-Amour", "Orgelet", "Clairvaux-les-Lacs", "Belfort", "Delle",

  // Lyon Area & Broader French Regions/Cities
  "Lyon", "Villeurbanne", "Vénissieux", "Vaulx-en-Velin", "Saint-Priest", "Caluire-et-Cuire", "Bron", "Meyzieu", "Rillieux-la-Pape", "Decines-Charpieu", "Oullins-Pierre-Bénite", "Sainte-Foy-lès-Lyon", "Tassin-la-Demi-Lune", "Écully", "Saint-Genis-Laval", "Givors", "Villefranche-sur-Saône", "Saint-Étienne", "Roanne", "Saint-Chamond", "Firminy", "Grenoble", "Échirolles", "Saint-Martin-d'Hères", "Voiron", "Meylan", "Valence", "Romans-sur-Isère", "Montélimar", "Vienne", "Bourgoin-Jallieu", "L'Isle-d'Abeau", "Villefontaine", "Clermont-Ferrand", "Riom", "Cournon-d'Auvergne", "Vichy", "Moulins", "Montluçon", "Aurillac", "Le Puy-en-Velay", "Thiers", "Issoire", "Chamalières", "Annonay", "Aubenas", "Tournon-sur-Rhône", "Privas", "Bourg-lès-Valence", "Nyons", "Crest", "Die", "Tarare", "Belleville-en-Beaujolais", "Anse", "Craponne", "Francheville", "Mions", "Genas",
  "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne", "Centre-Val de Loire", "Corse", "Grand Est", "Hauts-de-France", "Île-de-France", "Normandie", "Nouvelle-Aquitaine", "Occitanie", "Pays de la Loire", "Provence-Alpes-Côte d'Azur",
  "Strasbourg", "Mulhouse", "Colmar", "Reims", "Metz", "Nancy", "Troyes", "Charleville-Mézières", "Thionville", "Épinal", "Dijon", "Nevers", "Auxerre", "Mâcon", "Chalon-sur-Saône", "Beaune", "Marseille", "Nice", "Toulon", "Aix-en-Provence", "Avignon", "Cannes", "Antibes", "Grasse", "Menton", "Toulouse", "Montpellier", "Nîmes", "Perpignan", "Béziers", "Narbonne", "Carcassonne", "Bordeaux", "Limoges", "Poitiers", "La Rochelle", "Pau", "Bayonne", "Biarritz", "Nantes", "Saint-Nazaire", "Angers", "Le Mans", "Laval", "La Roche-sur-Yon", "Rennes", "Brest", "Quimper", "Lorient", "Vannes", "Saint-Malo", "Rouen", "Le Havre", "Caen", "Lille", "Amiens", "Dunkerque", "Calais", "Valenciennes", "Arras", "Tours", "Orléans", "Bourges", "Blois", "Chartres", "Versailles", "Saint-Germain-en-Laye", "Fontainebleau", "Boulogne-Billancourt", "Neuilly-sur-Seine"
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
            model: 'claude-3-5-sonnet-20241022',
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
