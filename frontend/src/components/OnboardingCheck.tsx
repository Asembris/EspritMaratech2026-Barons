'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAccessibility } from '@/context/AccessibilityContext';

export function OnboardingCheck() {
    const { hasCompletedOnboarding } = useAccessibility();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Allow access to login, onboarding itself, and static assets
        if (pathname === '/login' || pathname.startsWith('/onboarding')) return;

        // If onboarding not completed, redirect
        if (!hasCompletedOnboarding) {
            // Check if we are already securely initialized (sometimes context takes a tick)
            // const stored = localStorage.getItem('access_onboardingCompleted');
            // FORCE ONBOARDING: Ignore storage check
            // if (stored !== 'true') {
            router.push('/onboarding');
            // }
        }
    }, [hasCompletedOnboarding, pathname, router]);

    return null;
}
