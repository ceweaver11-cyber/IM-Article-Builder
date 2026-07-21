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
        ...(sha && { sha }) // Include SHA if updating an existing file
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
Generate exactly 5 independent articles. Return your complete output valid ONLY as a raw, valid JSON array of objects. Do not include phase markdown tags or conversational prose outside the JSON. Follow this exact JSON template schema layout:
[
  {
    "title": "Title of Article 1",
    "region": "Switzerland OR Eastern France",
    "content": "Full markdown formatted body of the short article in natural, punchy French here...",
    "sources": "Clear list or lines of markdown text attributing sources used"
  }
]`;

    try {
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-5',
            max_tokens: 8192,
            system: "You are an expert real estate data parser and elite copywriter. You only output raw, properly structured JSON arrays without any markdown wrapping blocks, code snippets wrappers, or introductory text.",
            messages: [{ role: 'user', content: prompt }]
        });

        const textBlock = response.content?.find(block => block.type === 'text') || response.content?.[0];
        const rawContent = (textBlock?.text || '').trim();
        const cleanedJSONString = rawContent.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        const newArticles = JSON.parse(cleanedJSONString);

        if (Array.isArray(newArticles)) {
            // Fetch current articles from GitHub
            const { sha, content: currentData } = await getArticlesFromGitHub();
            
            const formattedArticles = newArticles.map(art => ({
                id: Date.now() + Math.random().toString(36).substr(2, 5),
                title: art.title,
                region: art.region,
                date: new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }),
                content: art.content,
                sources: art.sources
            }));

            // Combine new and old articles
            const updatedData = [...formattedArticles, ...currentData];

            // Commit back to GitHub permanently
            await saveArticlesToGitHub(updatedData, sha);
            console.log('[Success] 5 new articles written to GitHub articles.json safely.');
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
