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
const REDDIT_RE = /^https?:\/\/(www\.|old\.|new\.|m\.)?(reddit\.com|redd\.it)\//i;
const REDDIT_POST_ID_RE = /(?:reddit\.com\/r\/[^/]+\/comments\/|redd\.it\/)([a-z0-9]+)/i;

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

  // Only use actual tweet media photos, not Twitter Card thumbnails or
  // profile-picture-update tweets (those have /profile_images/ URLs)
  const mediaPhoto = tweet.media?.photos?.find(p => p.url.includes('/media/'));

  const thumbnail =
    tweet.media?.videos?.[0]?.thumbnail_url ??
    mediaPhoto?.url ??
    undefined;

  return {
    ogTitle: author,
    ogDescription: tweet.text,
    ogImage: thumbnail,
    ogSiteName: 'X',
  };
}

const IMDB_TITLE_RE = /\/title\/(tt\d+)/i;

async function scrapeImdb(url: string): Promise<OgData> {
  const omdbKey = process.env.OMDB_API_KEY;
  const titleMatch = url.match(IMDB_TITLE_RE);

  if (omdbKey && titleMatch) {
    const res = await fetch(
      `https://www.omdbapi.com/?i=${titleMatch[1]}&apikey=${omdbKey}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (res.ok) {
      const data = await res.json() as {
        Response: string;
        Title?: string;
        Plot?: string;
        Poster?: string;
      };
      if (data.Response === 'True') {
        return {
          ogTitle: data.Title,
          ogDescription: data.Plot,
          ogImage: data.Poster !== 'N/A' ? data.Poster : undefined,
          ogSiteName: 'IMDb',
        };
      }
    }
  }

  // Fallback: scrape IMDb's own OG tags (works when Cloudflare allows it)
  const { result } = await ogs({
    url,
    timeout: 10000,
    fetchOptions: {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    },
  });

  const image =
    result.ogImage && Array.isArray(result.ogImage) && result.ogImage[0]
      ? result.ogImage[0].url
      : typeof result.ogImage === 'object' && result.ogImage !== null
      ? (result.ogImage as { url?: string }).url
      : undefined;

  if (result.ogTitle || image) {
    return {
      ogTitle: result.ogTitle?.replace(/ [-–] IMDb$/, ''),
      ogDescription: result.ogDescription,
      ogImage: image,
      ogSiteName: 'IMDb',
    };
  }

  return {};
}

const REDDIT_USER_AGENT =
  process.env.REDDIT_USER_AGENT ?? 'punk-records/1.0 (personal link-preview bot)';

let redditToken: { value: string; expiresAt: number } | null = null;

async function getRedditToken(): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (redditToken && redditToken.expiresAt > Date.now()) return redditToken.value;

  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': REDDIT_USER_AGENT,
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;

  const data = await res.json() as { access_token: string; expires_in: number };
  redditToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return redditToken.value;
}

function truncateText(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

interface RedditPost {
  title: string;
  is_self: boolean;
  selftext?: string;
  subreddit_name_prefixed?: string;
  thumbnail?: string;
  is_gallery?: boolean;
  media_metadata?: Record<string, { s?: { u?: string } }>;
  preview?: { images?: Array<{ source?: { url?: string } }> };
}

async function scrapeReddit(url: string): Promise<OgData> {
  const match = url.match(REDDIT_POST_ID_RE);
  if (!match) return {};
  const postId = match[1];

  const token = await getRedditToken();
  if (!token) return {};

  const res = await fetch(`https://oauth.reddit.com/comments/${postId}.json?raw_json=1&limit=1`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': REDDIT_USER_AGENT,
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return {};

  const data = await res.json() as Array<{ data?: { children?: Array<{ data?: RedditPost }> } }>;
  const post = data[0]?.data?.children?.[0]?.data;
  if (!post) return {};

  let image: string | undefined;
  if (post.is_gallery && post.media_metadata) {
    const first = Object.values(post.media_metadata)[0];
    image = first?.s?.u;
  }
  if (!image) image = post.preview?.images?.[0]?.source?.url;
  if (!image && post.thumbnail && /^https?:\/\//.test(post.thumbnail)) image = post.thumbnail;

  const description = post.is_self && post.selftext?.trim()
    ? truncateText(post.selftext.trim(), 300)
    : undefined;

  return {
    ogTitle: post.title,
    ogDescription: description,
    ogImage: image,
    ogSiteName: post.subreddit_name_prefixed,
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

  if (REDDIT_RE.test(url)) {
    try {
      return await scrapeReddit(url);
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
