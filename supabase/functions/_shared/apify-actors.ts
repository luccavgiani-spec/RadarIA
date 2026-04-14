// Mapeamento de source → Actor ID da Apify
// Usar sempre os Actors mais leves (Cheerio > Playwright quando possível)
export const APIFY_ACTORS: Record<string, string> = {
  website: 'apify/website-content-crawler',      // Cheerio — mais barato
  instagram: 'apify/instagram-scraper',
  meta_ads: 'apify/facebook-ads-scraper',
  google_maps: 'compass/crawler-google-places',
  linkedin_jobs: 'curious_coder/linkedin-jobs-scraper',
}

// Input padrão por tipo de fonte
// O competitor_id é preenchido dinamicamente pela Edge Function generate-briefing
// quando ela dispara os Actors via API
export const APIFY_ACTOR_INPUTS: Record<string, (input: string) => object> = {
  website: (url) => ({
    startUrls: [{ url }],
    maxCrawlPages: 3, // home + /preços + /sobre — mínimo necessário
    crawlerType: 'cheerio', // explicitamente Cheerio para economizar CUs
  }),
  instagram: (handle) => ({
    usernames: [handle],
    resultsLimit: 5, // últimos 5 posts
  }),
  meta_ads: (pageUrl) => ({
    startUrls: [{ url: pageUrl }],
    maxItems: 10,
  }),
  google_maps: (placeId) => ({
    placeIds: [placeId],
    maxReviews: 5,
  }),
  linkedin_jobs: (companyUrl) => ({
    companyUrls: [companyUrl],
    maxJobs: 10,
  }),
}
