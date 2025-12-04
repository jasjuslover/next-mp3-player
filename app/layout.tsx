import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MP3 Streamer",
  description: "Stream background audio from JSON playlists"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-transparent text-white antialiased">{children}</body>
    </html>
  );
}
