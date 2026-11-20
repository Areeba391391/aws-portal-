import type { Metadata } from "next";
import { Poppins, Inter, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { EnrollmentProvider } from "@/context/EnrollmentContext";
import { EventRegistrationProvider } from "@/context/EventRegistrationContext";
import { VtmsProvider } from "@/context/VtmsContext";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AWS SBG UET Taxila",
  description:
    "Learn AWS Cloud. Build. Innovate Together — the official portal for AWS SBG UET Taxila: hackathons, courses, and student community.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${poppins.variable} ${jetbrains.variable} ${inter.variable} ${manrope.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <DataProvider>
              <VtmsProvider>
              <EnrollmentProvider>
                <EventRegistrationProvider>{children}</EventRegistrationProvider>
              </EnrollmentProvider>
              </VtmsProvider>
            </DataProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
