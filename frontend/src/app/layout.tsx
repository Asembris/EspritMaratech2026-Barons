import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/Providers";
import GlobalAudioToggle from "@/components/GlobalAudioToggle";
import AssistantChat from "@/components/AssistantChat";
import NavBar from "@/components/NavBar";
import { UserProvider } from "@/context/UserContext";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { OnboardingCheck } from "@/components/OnboardingCheck";
import SignLanguageSummary from "@/components/SignLanguageSummary";
import VoiceControlManager from "@/components/VoiceControlManager";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SignLink - Langue des Signes",
  description: "Convertisseur de texte en Langue des Signes Française avec détection de gestes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        {/* MediaPipe Scripts for Hand Detection */}
        <Script
          src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="providers-wrapper">
          <a href="#main-content" className="skip-link">Aller au contenu principal</a>
          {/* Client-side providers */}
          <Providers>
            <AccessibilityProvider>
              <UserProvider>
                <OnboardingCheck />
                <NavBar />
                {children}
                <GlobalAudioToggle />
                <AssistantChat />
                <SignLanguageSummary />
                <VoiceControlManager />
              </UserProvider>
            </AccessibilityProvider>
          </Providers>
        </div>
      </body>
    </html>
  );
}
