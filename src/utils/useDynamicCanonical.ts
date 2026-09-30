import { useEffect } from 'react';
import { NavigationLocation, locationToPath } from '../contexts/NavigationContext';

const PRIMARY_DOMAIN = 'https://www.avertrader.space';

/**
 * Normalizes a URL path to a clean canonical format:
 * - Strips query parameters and hash fragments
 * - Resolves double slashes
 * - Keeps trailing slash for root ('/'), removes trailing slash for subpaths ('/deposit')
 */
export function getCleanPathname(pathname: string = '/'): string {
  if (!pathname || pathname === '' || pathname === '/') {
    return '/';
  }
  const clean = pathname.split('?')[0].split('#')[0];
  const normalized = clean.replace(/\/+/g, '/');
  return normalized.length > 1 && normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

/**
 * Computes canonical URL for the current location state and browser pathname.
 */
export function getCanonicalUrl(currentLocation?: NavigationLocation): string {
  if (currentLocation) {
    const p = locationToPath(currentLocation);
    return `${PRIMARY_DOMAIN}${p === '/' ? '/' : p}`;
  }
  if (typeof window !== 'undefined') {
    const path = getCleanPathname(window.location.pathname);
    return `${PRIMARY_DOMAIN}${path === '/' ? '/' : path}`;
  }
  return `${PRIMARY_DOMAIN}/`;
}

/**
 * Dynamic Canonical Link Hook
 * Automatically updates or injects `<link rel="canonical" href="..." />` in <head>
 * ensuring search engines attribute all content to the primary custom domain.
 */
export function useDynamicCanonical(currentLocation?: NavigationLocation) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const canonicalUrl = getCanonicalUrl(currentLocation);

    // Locate or create the canonical link tag in document head
    let linkTag = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!linkTag) {
      linkTag = document.createElement('link');
      linkTag.setAttribute('rel', 'canonical');
      document.head.appendChild(linkTag);
    }

    if (linkTag.getAttribute('href') !== canonicalUrl) {
      linkTag.setAttribute('href', canonicalUrl);
    }

    // Also synchronize og:url to maintain consistency
    const ogUrlTag = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (ogUrlTag && ogUrlTag.getAttribute('content') !== canonicalUrl) {
      ogUrlTag.setAttribute('content', canonicalUrl);
    }
  }, [currentLocation?.view, currentLocation?.tab, currentLocation?.subView, currentLocation?.modal]);
}
