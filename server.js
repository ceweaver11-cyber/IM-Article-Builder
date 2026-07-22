/**
 * Dual-Agent AI Writer Execution Engine (Batch Mode: 2 Long Articles per Trigger)
 */
async function generateDailyArticles() {
    // Pick 2 locations at random for this batch run
    const selectedLocations = getRandomLocations(2);
    console.log(`[Automation Triggered] Generating 2 long-form articles for: ${selectedLocations.join(', ')}`);

    const prompt = `You are a dual-agent AI workspace designed for Milestone Investment Management (Milestone IM). You operate as two distinct entities sequentially: the "Senior Investment Strategist & Writer" and the "Rigorous Quality Reviewer."

### YOUR VOICE & BRAND DNA:
Your writing tone is inspired by "Les Secrets de l'Immo" but modernized: natural, conversational, and direct. You write with sharp, high-interest titles targeting Family Offices, SCPIs, Investment Funds, Real Estate Professionals, and Wealth Advisors, followed by high-value, data-rich analysis.

### MANDATORY LOCATION FOCUS FOR THIS BATCH:
You must generate exactly 2 comprehensive, long-form articles. Each article MUST focus strictly on one of the following 2 locations:
${selectedLocations.map((loc, index) => `${index + 1}. ${loc}`).join('\n')}

### THE WRITING RULES FOR LONG-FORM ARTICLES:
1. DEPTH & LENGTH: Write detailed, multi-section articles (~600–900 words each). Provide granular breakdowns of real estate fundamentals, yield spreads, capital markets, and local demographic trends.
2. TIMELINESS: Ground all macroeconomic and property metrics strictly in recent data (2023–2026 window).
3. FACTUAL VERIFIABILITY: Include specific metrics (e.g., prime office/logistics cap rates, vacancy percentages, indexation rates, LTV constraints).
4. NO DIRECT QUOTES & NO CITATIONS: Never cite authors or reference book titles directly.
5. MANDATORY SOURCES: Every article must include 2-3 credible institutional sources at the end.
6. LANGUAGE: Impeccable, highly natural French.

### OUTPUT FORMAT REQUIREMENT:
Generate exactly 2 long-form articles matching the locations above. Return your complete output strictly as a raw JSON array of objects without markdown block syntax (\`\`\`json) or extraneous intro text:

[
  {
    "title": "Title in French",
    "region": "Selected Location Name",
    "content": "Comprehensive paragraph 1\\n\\nComprehensive paragraph 2\\n\\nComprehensive paragraph 3...",
    "sources": "Source 1, Source 2"
  }
]`;

    try {
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 16000,
            system: "You are an expert real estate data parser and elite copywriter. You only output valid raw JSON arrays without markdown wrappers or codeblock syntax.",
            messages: [{ role: 'user', content: prompt }]
        });

        const textBlock = response.content?.find(block => block.type === 'text') || response.content?.[0];
        let rawContent = (textBlock?.text || '').trim();

        // Strip backticks or markdown codeblock wrappers
        rawContent = rawContent.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/g, '').trim();

        let newArticles;
        try {
            newArticles = JSON.parse(rawContent);
        } catch (jsonErr) {
            console.error("[JSON Parse Failure] Output was malformed. Output snippet end:", rawContent.slice(-200));
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

            // Append new articles to top of database array
            const updatedData = [...formattedArticles, ...currentData];
            await saveArticlesToGitHub(updatedData, sha);
            console.log('[Success] 2 long-form articles appended to GitHub articles.json safely.');
        }
    } catch (error) {
        console.error('[Error Run-Time Pipeline Failure]:', error);
    }
}
