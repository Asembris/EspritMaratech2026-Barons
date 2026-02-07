'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type FontSize = 'normal' | 'large' | 'extra-large';

interface AccessibilityContextType {
    fontSize: FontSize;
    setFontSize: (size: FontSize) => void;
    isVoiceNavEnabled: boolean;
    setVoiceNavEnabled: (enabled: boolean) => void;
    isSignLanguageEnabled: boolean;
    setSignLanguageEnabled: (enabled: boolean) => void;
    isSoundEnabled: boolean;
    setSoundEnabled: (enabled: boolean) => void;
    hasCompletedOnboarding: boolean;
    completeOnboarding: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
    const [fontSize, setFontSize] = useState<FontSize>('normal');
    const [isVoiceNavEnabled, setVoiceNavEnabled] = useState(false);
    const [isSignLanguageEnabled, setSignLanguageEnabled] = useState(false);
    const [isSoundEnabled, setSoundEnabled] = useState(true);
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

    // Load settings from localStorage on mount
    useEffect(() => {
        const storedFontSize = localStorage.getItem('access_fontSize') as FontSize;
        if (storedFontSize) setFontSize(storedFontSize);

        const storedVoice = localStorage.getItem('access_voiceNav');
        if (storedVoice) setVoiceNavEnabled(storedVoice === 'true');

        const storedSign = localStorage.getItem('access_signLang');
        if (storedSign) setSignLanguageEnabled(storedSign === 'true');

        const storedSound = localStorage.getItem('access_sound');
        if (storedSound) setSoundEnabled(storedSound === 'true');

        const storedOnboarding = localStorage.getItem('access_onboardingCompleted');
        // FORCE ONBOARDING EVERY TIME (Demo Mode)
        // if (storedOnboarding) setHasCompletedOnboarding(storedOnboarding === 'true');
        // Always start as false to force questions
        setHasCompletedOnboarding(false);
    }, []);

    // Apply Font Size to HTML tag
    useEffect(() => {
        document.documentElement.setAttribute('data-fontsize', fontSize);
        localStorage.setItem('access_fontSize', fontSize);
    }, [fontSize]);

    // Apply Sound Setting (sync with global audio if needed, for now just storage)
    useEffect(() => {
        localStorage.setItem('access_sound', String(isSoundEnabled));
    }, [isSoundEnabled]);

    const completeOnboarding = () => {
        setHasCompletedOnboarding(true);
        localStorage.setItem('access_onboardingCompleted', 'true');
    };

    const value = {
        fontSize,
        setFontSize,
        isVoiceNavEnabled,
        setVoiceNavEnabled: (val: boolean) => {
            setVoiceNavEnabled(val);
            localStorage.setItem('access_voiceNav', String(val));
        },
        isSignLanguageEnabled,
        setSignLanguageEnabled: (val: boolean) => {
            setSignLanguageEnabled(val);
            localStorage.setItem('access_signLang', String(val));
        },
        isSoundEnabled,
        setSoundEnabled,
        hasCompletedOnboarding,
        completeOnboarding
    };

    return (
        <AccessibilityContext.Provider value={value}>
            {children}
        </AccessibilityContext.Provider>
    );
}

export function useAccessibility() {
    const context = useContext(AccessibilityContext);
    if (context === undefined) {
        throw new Error('useAccessibility must be used within an AccessibilityProvider');
    }
    return context;
}
