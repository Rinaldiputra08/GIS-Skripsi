import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KopiSpasial Bogor - SIG Blank Spot & Celah Pasar Kedai Kopi (AHP-TOPSIS)",
  description:
    "Sistem Informasi Geografis (SIG) berbasis Web untuk analisis celah pasar (market gap / blank spot) lokasi kedai kopi di Kota Bogor menggunakan integrasi metode Analytic Hierarchy Process (AHP) dan TOPSIS berbasis Spatial Grid Sampling.",
  keywords: [
    "Web GIS",
    "Kedai Kopi Bogor",
    "AHP",
    "TOPSIS",
    "Spatial Analysis",
    "Kota Bogor",
    "Market Gap",
    "Blank Spot",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="h-full w-full overflow-hidden bg-slate-950 text-slate-100 flex flex-col">
        {children}
      </body>
    </html>
  );
}
