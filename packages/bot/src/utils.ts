export const CANVAS_PREFIX = 'canvas-';
export const PRIVATE_PREFIX = 'canvas-private-';

export function isCanvasChannel(name: string): boolean {
  return name.startsWith(CANVAS_PREFIX);
}

export function isPrivateChannel(name: string): boolean {
  return name.startsWith(PRIVATE_PREFIX);
}

export function channelNameToCollageName(channelName: string): string {
  return channelName.slice(CANVAS_PREFIX.length).replace(/-/g, ' ');
}

const URL_REGEX = /https?:\/\/[^\s]+/i;

export function extractUrl(text: string): string | null {
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}
