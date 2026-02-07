'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccessibility } from '@/context/AccessibilityContext';
import { StepVision } from '@/components/onboarding/StepVision';
import { StepSignLanguage } from '@/components/onboarding/StepSignLanguage';
import { StepTypography } from '@/components/onboarding/StepTypography';
import { StepAudioCheck } from '@/components/onboarding/StepAudioCheck';

export default function OnboardingPage() {
    const [step, setStep] = useState(1);
    const { completeOnboarding } = useAccessibility();
    const router = useRouter();

    const handleNext = () => {
        if (step < 4) {
            setStep(step + 1);
        } else {
            completeOnboarding();
            router.push('/');
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Progress Bar */}
                <div className="mb-8 flex gap-2">
                    {[1, 2, 3, 4].map(i => (
                        <div
                            key={i}
                            className={`h-2 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-blue-500' : 'bg-gray-800'}`}
                        />
                    ))}
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 sm:p-12 shadow-2xl">
                    {step === 1 && <StepVision onNext={handleNext} />}
                    {step === 2 && <StepSignLanguage onNext={handleNext} />}
                    {step === 3 && <StepTypography onNext={handleNext} />}
                    {step === 4 && <StepAudioCheck onNext={handleNext} />}
                </div>
            </div>
        </div>
    );
}
