import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f1ea",
};

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
      className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full w-full overflow-hidden bg-oat text-ink flex flex-col">
        {children}
      </body>
    </html>
  );
}
