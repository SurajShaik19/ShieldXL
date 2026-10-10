import { Platform, AIWebsite, PlatformDetectionResult, MediaType } from '../types/index.js';

// Exact allowlisted hostnames
const META_HOSTS = new Set([
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'web.facebook.com',
  'fb.watch',
  'instagram.com',
  'www.instagram.com',
]);

const X_HOSTS = new Set([
  'x.com',
  'www.x.com',
  'twitter.com',
  'www.twitter.com',
  'mobile.twitter.com',
]);

const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

export class PlatformDetectionService {
  /**
   * Validates and analyzes a social media URL.
   * Enforces strict URL parsing, hostname allowlisting, protocol check, SSRF protection,
   * credential stripping/rejection, and platform identification.
   */
  public static detect(inputUrl: string): PlatformDetectionResult {
    if (!inputUrl || typeof inputUrl !== 'string') {
      return {
        platform: 'UNSUPPORTED',
        normalizedUrl: '',
        hostname: '',
        isValid: false,
        isSupported: false,
        errorMessage: 'URL string is required.',
      };
    }

    const trimmed = inputUrl.trim();
    if (!trimmed) {
      return {
        platform: 'UNSUPPORTED',
        normalizedUrl: '',
        hostname: '',
        isValid: false,
        isSupported: false,
        errorMessage: 'URL cannot be empty.',
      };
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return {
        platform: 'UNSUPPORTED',
        normalizedUrl: trimmed,
        hostname: '',
        isValid: false,
        isSupported: false,
        errorMessage: 'Malformed URL. Please provide a valid absolute URL.',
      };
    }

    // Protocol check: Only http: and https: allowed
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        platform: 'UNSUPPORTED',
        normalizedUrl: trimmed,
        hostname: parsed.hostname || '',
        isValid: false,
        isSupported: false,
        errorMessage: `Unsupported protocol: '${parsed.protocol}'. Only HTTPS or HTTP allowed.`,
      };
    }

    // Embedded credentials check: Reject deceptive formats like https://admin:password@x.com
    if (parsed.username || parsed.password) {
      return {
        platform: 'UNSUPPORTED',
        normalizedUrl: trimmed,
        hostname: parsed.hostname,
        isValid: false,
        isSupported: false,
        errorMessage: 'Security violation: Embedded credentials in URL are prohibited.',
      };
    }

    const rawHostname = parsed.hostname.toLowerCase();

    // Check for SSRF / local / private IPs
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(rawHostname)) {
        return {
          platform: 'UNSUPPORTED',
          normalizedUrl: trimmed,
          hostname: rawHostname,
          isValid: false,
          isSupported: false,
          errorMessage: 'Security violation: Local and private hostnames are prohibited.',
        };
      }
    }

    // Determine platform strictly by exact allowlist match
    let platform: Platform = 'UNSUPPORTED';
    let selectedAiWebsite: AIWebsite | undefined;

    if (META_HOSTS.has(rawHostname)) {
      platform = 'META';
      selectedAiWebsite = 'META_AI';
    } else if (X_HOSTS.has(rawHostname)) {
      platform = 'X';
      selectedAiWebsite = 'GROK';
    } else {
      return {
        platform: 'UNSUPPORTED',
        normalizedUrl: trimmed,
        hostname: rawHostname,
        isValid: true,
        isSupported: false,
        errorMessage: `Unsupported domain '${rawHostname}'. Only Facebook, Instagram, X (Twitter) URLs are supported.`,
      };
    }

    // Path must not be empty or root
    if (parsed.pathname === '/' || parsed.pathname === '') {
      return {
        platform,
        normalizedUrl: trimmed,
        hostname: rawHostname,
        isValid: false,
        isSupported: true,
        errorMessage: 'URL points to platform root. Please submit a direct link to a post, reel, or tweet.',
      };
    }

    // Normalize URL: Force HTTPS, remove tracking query parameters like fbclid, igshid, t, s, etc.
    const normalized = new URL(parsed.toString());
    normalized.protocol = 'https:';

    // Strip common social media tracking parameters
    const trackingParams = ['fbclid', 'igshid', 's', 't', 'utm_source', 'utm_medium', 'utm_campaign', 'ref', 'ref_src'];
    for (const param of trackingParams) {
      normalized.searchParams.delete(param);
    }

    // Infer potential media type hint based on hostname/path if clearly known
    let mediaTypeHint: MediaType = 'UNKNOWN';
    const path = normalized.pathname.toLowerCase();
    if (rawHostname === 'fb.watch' || path.includes('/reel/') || path.includes('/reels/') || path.includes('/watch') || path.includes('/video/')) {
      mediaTypeHint = 'VIDEO';
    } else if (path.includes('/p/') || path.includes('/photo/') || path.includes('/photos/')) {
      mediaTypeHint = 'IMAGE';
    } else if (path.includes('/status/') || path.includes('/posts/')) {
      mediaTypeHint = 'POST';
    }

    return {
      platform,
      normalizedUrl: normalized.toString(),
      hostname: rawHostname,
      isValid: true,
      isSupported: true,
      selectedAiWebsite,
      mediaTypeHint,
    };
  }
}
