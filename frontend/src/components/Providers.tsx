'use client';

import { AudioProvider } from '@/contexts/AudioContext';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <AudioProvider>
            {children}
        </AudioProvider>
    );
}
