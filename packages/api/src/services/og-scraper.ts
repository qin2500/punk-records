import ogs from 'open-graph-scraper';

export interface OgData {
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogSiteName?: string;
  ogFavicon?: string;
}

const TWITTER_RE = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\//i;
const TWEET_PATH_RE = /(?:twitter|x)\.com\/([^/?#]+)\/status\/(\d+)/i;
const IMDB_RE = /^https?:\/\/(www\.)?imdb\.com\//i;

async function scrapeTwitter(url: string): Promise<OgData> {
  const match = url.match(TWEET_PATH_RE);
  if (!match) return {};

  const [, username, tweetId] = match;

  const res = await fetch(
    `https://api.fxtwitter.com/${username}/status/${tweetId}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) return {};

  const data = await res.json() as {
    tweet?: {
      text?: string;
      author?: { name: string; screen_name: string };
      media?: {
        videos?: Array<{ thumbnail_url: string }>;
        photos?: Array<{ url: string }>;
      };
    };
  };

  const tweet = data.tweet;
  if (!tweet) return {};

  const author = tweet.author
    ? `${tweet.author.name} @${tweet.author.screen_name}`
    : undefined;

  const thumbnail =
    tweet.media?.videos?.[0]?.thumbnail_url ??
    tweet.media?.photos?.[0]?.url ??
    undefined;

  return {
    ogTitle: author,
    ogDescription: tweet.text,
    ogImage: thumbnail,
    ogSiteName: 'X',
  };
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

async function scrapeImdb(url: string): Promise<OgData> {
  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return {};

  const html = await res.text();

  // IMDB embeds JSON-LD structured data — prefer it over OG tags
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (jsonLdMatch) {
    try {
      const data = JSON.parse(jsonLdMatch[1]) as {
        name?: string;
        description?: string;
        image?: string | { url?: string };
      };
      const image = typeof data.image === 'string'
        ? data.image
        : data.image?.url;
      if (data.name) {
        return {
          ogTitle: data.name,
          ogDescription: data.description,
          ogImage: image,
          ogSiteName: 'IMDb',
        };
      }
    } catch {
      // fall through to OG tag extraction
    }
  }

  // Fallback: parse OG tags from raw HTML
  const titleMatch = html.match(/<meta property="og:title" content="([^"]*?)"/);
  const imageMatch = html.match(/<meta property="og:image" content="([^"]*?)"/);
  const descMatch = html.match(/<meta property="og:description" content="([^"]*?)"/);

  return {
    ogTitle: titleMatch?.[1],
    ogDescription: descMatch?.[1],
    ogImage: imageMatch?.[1],
    ogSiteName: 'IMDb',
  };
}

export async function scrapeOg(url: string): Promise<OgData> {
  if (TWITTER_RE.test(url)) {
    try {
      return await scrapeTwitter(url);
    } catch {
      return {};
    }
  }

  if (IMDB_RE.test(url)) {
    try {
      return await scrapeImdb(url);
    } catch {
      return {};
    }
  }

  try {
    const { result } = await ogs({ url, timeout: 10000 });
    const image =
      result.ogImage && Array.isArray(result.ogImage) && result.ogImage[0]
        ? result.ogImage[0].url
        : typeof result.ogImage === 'object' && result.ogImage !== null
        ? (result.ogImage as { url?: string }).url
        : undefined;

    return {
      ogTitle: result.ogTitle,
      ogDescription: result.ogDescription,
      ogImage: image,
      ogSiteName: result.ogSiteName,
      ogFavicon: result.favicon,
    };
  } catch {
    return {};
  }
}
