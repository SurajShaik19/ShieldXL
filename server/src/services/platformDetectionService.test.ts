import { describe, it, expect } from 'vitest';
import { PlatformDetectionService } from './platformDetectionService.js';

describe('PlatformDetectionService', () => {
  describe('Valid Meta URLs', () => {
    it('detects facebook.com post and routes to META_AI', () => {
      const res = PlatformDetectionService.detect('https://facebook.com/username/posts/1029384756');
      expect(res.isValid).toBe(true);
      expect(res.isSupported).toBe(true);
      expect(res.platform).toBe('META');
      expect(res.selectedAiWebsite).toBe('META_AI');
      expect(res.hostname).toBe('facebook.com');
      expect(res.normalizedUrl).toBe('https://facebook.com/username/posts/1029384756');
      expect(res.mediaTypeHint).toBe('POST');
    });

    it('detects www.facebook.com reel and strips tracking query parameters', () => {
      const res = PlatformDetectionService.detect(
        'https://www.facebook.com/reel/987654321?fbclid=IwAR2XYZ_track&utm_source=feed'
      );
      expect(res.isValid).toBe(true);
      expect(res.isSupported).toBe(true);
      expect(res.platform).toBe('META');
      expect(res.selectedAiWebsite).toBe('META_AI');
      expect(res.mediaTypeHint).toBe('VIDEO');
      expect(res.normalizedUrl).toBe('https://www.facebook.com/reel/987654321');
    });

    it('detects fb.watch video link', () => {
      const res = PlatformDetectionService.detect('https://fb.watch/abcdef123/');
      expect(res.isValid).toBe(true);
      expect(res.isSupported).toBe(true);
      expect(res.platform).toBe('META');
      expect(res.mediaTypeHint).toBe('VIDEO');
    });

    it('detects instagram.com post and image mediaTypeHint', () => {
      const res = PlatformDetectionService.detect('https://www.instagram.com/p/Cxyz12345/?igshid=xyz123');
      expect(res.isValid).toBe(true);
      expect(res.isSupported).toBe(true);
      expect(res.platform).toBe('META');
      expect(res.selectedAiWebsite).toBe('META_AI');
      expect(res.mediaTypeHint).toBe('IMAGE');
      expect(res.normalizedUrl).toBe('https://www.instagram.com/p/Cxyz12345/');
    });

    it('detects instagram.com reel and video mediaTypeHint', () => {
      const res = PlatformDetectionService.detect('https://instagram.com/reel/DA12345678/');
      expect(res.isValid).toBe(true);
      expect(res.platform).toBe('META');
      expect(res.mediaTypeHint).toBe('VIDEO');
    });
  });

  describe('Valid X.com & Twitter URLs', () => {
    it('detects x.com post and routes to GROK', () => {
      const res = PlatformDetectionService.detect('https://x.com/elonmusk/status/1888888888888888888');
      expect(res.isValid).toBe(true);
      expect(res.isSupported).toBe(true);
      expect(res.platform).toBe('X');
      expect(res.selectedAiWebsite).toBe('GROK');
      expect(res.hostname).toBe('x.com');
      expect(res.normalizedUrl).toBe('https://x.com/elonmusk/status/1888888888888888888');
      expect(res.mediaTypeHint).toBe('POST');
    });

    it('detects twitter.com URL and strips tracking query parameters', () => {
      const res = PlatformDetectionService.detect('https://twitter.com/NASA/status/1234567890?s=20&t=abcdef');
      expect(res.isValid).toBe(true);
      expect(res.isSupported).toBe(true);
      expect(res.platform).toBe('X');
      expect(res.selectedAiWebsite).toBe('GROK');
      expect(res.normalizedUrl).toBe('https://twitter.com/NASA/status/1234567890');
    });

    it('detects www.x.com and mobile.twitter.com', () => {
      const res1 = PlatformDetectionService.detect('https://www.x.com/user/status/999');
      expect(res1.platform).toBe('X');
      const res2 = PlatformDetectionService.detect('https://mobile.twitter.com/user/status/999');
      expect(res2.platform).toBe('X');
    });
  });

  describe('Deceptive Domains & Security Rejections', () => {
    it('rejects deceptive phishing subdomain such as facebook.com.example.org', () => {
      const res = PlatformDetectionService.detect('https://facebook.com.example.org/post/123');
      expect(res.platform).toBe('UNSUPPORTED');
      expect(res.isSupported).toBe(false);
      expect(res.errorMessage).toContain('Unsupported domain');
    });

    it('rejects deceptive x.com.attacker.com', () => {
      const res = PlatformDetectionService.detect('https://x.com.attacker.com/status/123');
      expect(res.platform).toBe('UNSUPPORTED');
      expect(res.isSupported).toBe(false);
    });

    it('rejects URLs with embedded credentials (SSRF/Phishing protection)', () => {
      const res = PlatformDetectionService.detect('https://admin:secret@facebook.com/post/123');
      expect(res.isValid).toBe(false);
      expect(res.isSupported).toBe(false);
      expect(res.errorMessage).toContain('Embedded credentials');
    });

    it('rejects SSRF localhost and private IP addresses', () => {
      const resLocal = PlatformDetectionService.detect('http://localhost:5000/api');
      expect(resLocal.isValid).toBe(false);
      expect(resLocal.errorMessage).toContain('Local and private hostnames');

      const resIp = PlatformDetectionService.detect('http://127.0.0.1/test');
      expect(resIp.isValid).toBe(false);

      const resPrivate = PlatformDetectionService.detect('http://192.168.1.1/router');
      expect(resPrivate.isValid).toBe(false);
    });

    it('rejects unsupported protocols (ftp, file, javascript)', () => {
      const resFtp = PlatformDetectionService.detect('ftp://facebook.com/post/1');
      expect(resFtp.isValid).toBe(false);
      expect(resFtp.errorMessage).toContain('Unsupported protocol');

      const resFile = PlatformDetectionService.detect('file:///etc/passwd');
      expect(resFile.isValid).toBe(false);
    });

    it('rejects malformed or empty URLs', () => {
      const resEmpty = PlatformDetectionService.detect('');
      expect(resEmpty.isValid).toBe(false);

      const resGibberish = PlatformDetectionService.detect('not_a_url');
      expect(resGibberish.isValid).toBe(false);
    });

    it('rejects platform root without post path', () => {
      const res = PlatformDetectionService.detect('https://facebook.com/');
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toContain('URL points to platform root');
    });
  });
});
