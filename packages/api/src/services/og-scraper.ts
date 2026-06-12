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

export async function scrapeOg(url: string): Promise<OgData> {
  if (TWITTER_RE.test(url)) {
    try {
      return await scrapeTwitter(url);
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
