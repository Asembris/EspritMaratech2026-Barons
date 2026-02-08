'use client';

import SignConverter from '@/components/SignConverter';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function TranslatePage() {
    const { user, isLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    if (isLoading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Chargement...</div>;

    return (
        <div className="min-h-screen bg-gray-950 text-white pt-6">
            <SignConverter />
        </div>
    );
}
