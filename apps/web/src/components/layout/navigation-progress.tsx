'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [, startTransition] = useTransition();

  // Reset navigation indicator whenever route changes
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname, searchParams]);

  // Intercept client-side link clicks to initiate immediate top-line progress
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;

      // Ignore external links, anchor hashes, new tabs, modifier keys
      if (
        href.startsWith('http') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#') ||
        target.getAttribute('target') === '_blank' ||
        target.getAttribute('download') !== null ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey ||
        e.defaultPrevented
      ) {
        return;
      }

      // If navigating to the exact current pathname, don't trigger
      const url = new URL(href, window.location.origin);
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      startTransition(() => {
        setIsNavigating(true);
      });
    };

    document.addEventListener('click', handleLinkClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleLinkClick, { capture: true });
    };
  }, []);

  if (!isNavigating) return null;

  return (
    <div
      role="progressbar"
      aria-label="Navigation Loading Progress"
      className="fixed top-0 left-0 right-0 z-50 pointer-events-none motion-reduce:hidden"
    >
      {/* Background track */}
      <div className="h-[2.5px] w-full bg-slate-900/40 backdrop-blur-[1px]">
        {/* Animated Gold Shimmer Stream */}
        <div className="h-full w-full bg-gradient-to-r from-amber-600 via-amber-300 to-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.7)] animate-subtle-progress origin-left" />
      </div>
    </div>
  );
}

