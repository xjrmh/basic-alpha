import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import "@/app/globals.css";
import { cn } from "@/lib/utils";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope"
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"]
});

export const metadata: Metadata = {
  title: "BasicAlpha",
  description: "Financial intelligence dashboard for S&P 500 and Nasdaq-100 stocks"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={cn(manrope.variable, ibmPlexMono.variable, "bg-background text-foreground")}>
        {children}
      </body>
    </html>
  );
}
