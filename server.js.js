const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const cron = require('node-cron');
const { Anthropic } = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'articles.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure local JSON storage exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}

// Instantiate Anthropic Client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Dual-Agent AI Writer Execution Engine
 */
async function generateDailyArticles() {
    console.log('[Automation Triggered] Launching Claude Dual-Agent Framework...');
    
    const prompt = `You are a dual-agent AI workspace designed for Milestone Investment Management (Milestone IM). You operate as two distinct entities sequentially: the "Senior Investment Strategist & Writer" and the "Rigorous Quality Reviewer."

### YOUR VOICE & BRAND DNA:
Your writing tone is inspired by "Les Secrets de l'Immo" but modernized: it must be completely natural, conversational, and direct—never pedantic, rigid, or overly formal ("snobby"). You write with sharp, high-interest ("clickbait") titles that hook Family Offices, SCPI, Investment Funds, Real estate professionals, Wealth Management Advisors, and Investment Platforms, but follow up immediately with high-value, data-rich analysis. Your content mirrors Milestone IM's operational reality: an end-to-end asset manager that selects, models, structures, and delivers value.

### THE WRITING RULES:
1. LOCATION & TIMELINESS: Every article must anchor its core concept within specific premium regional corridors—specifically Switzerland (e.g., Geneva/Grand Genève) or Eastern France (e.g., Haute-Savoie, Lyon). Strictly exclude Paris/Île-de-France.
2. THE 4-YEAR DATA RULE: All macroeconomic and property figures must be highly recent. Never use data older than 4 years (Strictly within the 2023-2026 window). Look into yields, interest rates, or transaction volumes.
3. FACTUAL VERIFIABILITY: Avoid abstract generalities. Ground your thesis in tangible metrics (e.g., prime office vacancy rates, indexation, LTV constraints, or technical renovation costs).
4. NO DIRECT QUOTES & NO CITATIONS: Never mention book titles or authors from reference texts.
5. NO STATIC PILLARS: Every article must tackle a unique, fluid concept driven by real-time market realities.
6. MANDATORY CLICKABLE SOURCES: Every piece of data used from a reputable source (e.g., government/institutional publications, JLL, Cushman & Wakefield, Immostat, BNP Paribas Real Estate, INSEE, Wüest Partner) must be listed transparently at the very bottom of the article.
7. LANGUAGE: Impeccable, highly natural French.

### OUTPUT FORMAT REQUIREMENT:
Generate exactly 10 independent articles. Return your complete output valid ONLY as a raw, valid JSON array of objects. Do not include phase markdown tags or conversational prose outside the JSON. Follow this exact JSON template schema layout:
[
  {
    "title": "Title of Article 1",
    "region": "Switzerland OR Eastern France",
    "content": "Full markdown formatted body of the short article in natural, punchy French here...",
    "sources": "Clear list or lines of markdown text attributing sources used"
  },
  ...
]`;

    try {
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4000,
            temperature: 0.7,
            system: "You are an expert real estate data parser and elite copywriter. You only output raw, properly structured JSON arrays without any markdown wrapping blocks, code snippets wrappers, or introductory text.",
            messages: [{ role: 'user', content: prompt }]
        });

        const rawContent = response.content[0].text.trim();
        // Sanitize out potentially wrapped markdown code barriers if Claude adds them
        const cleanedJSONString = rawContent.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        
        const newArticles = JSON.parse(cleanedJSONString);

        if (Array.isArray(newArticles)) {
            const currentData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
            
            // Format each generated item with the current timestamp
            const formattedArticles = newArticles.map(art => ({
                id: Date.now() + Math.random().toString(36).substr(2, 5),
                title: art.title,
                region: art.region,
                date: new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }),
                content: art.content,
                sources: art.sources
            }));

            // Append onto database
            const updatedData = [...formattedArticles, ...currentData];
            fs.writeFileSync(DB_FILE, JSON.stringify(updatedData, null, 2));
            console.log(`[Success] 10 new articles written to articles.json safely.`);
        }
    } catch (error) {
        console.error('[Error Run-Time Pipeline Failure]:', error);
    }
}

// Automation Scheduler: Runs daily at 11:59 PM (23:59)
cron.schedule('59 23 * * *', () => {
    generateDailyArticles();
});

// API endpoint for Frontend UI
app.get('/api/articles', (req, res) => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: "Failed to read database articles record." });
    }
});
// Manual trigger route for initial populating/testing (Allows external cron-jobs)
app.post('/api/trigger-generation', (req, res) => {
    const cronSecret = req.headers['x-cron-secret'];
    
    // Simple pass-phrase check to prevent unauthorized spamming of your Claude key
    if (cronSecret !== "MilestoneIM2026SecurePass") {
        return res.status(401).json({ error: "Unauthorized: Missing or invalid security token header." });
    }

    // Instantly respond to cron-job.org so it doesn't time out (takes < 0.1 seconds)
    res.json({ message: "Generation protocol initiated successfully in the background." });

    // Let the server write the articles in the background
    generateDailyArticles().catch(err => {
        console.error("[Background Error] Daily article generation failed:", err);
    });
});

app.listen(PORT, () => {
    console.log(`Milestone IM Platform Online: http://localhost:${PORT}`);
});
