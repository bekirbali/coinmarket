import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "BTC Mining",
  description: "Modern coin website with interactive elements",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="bg-black text-white p-4">
          <Navbar />
        </header>
        <main className="min-h-screen">{children}</main>
        <footer className="bg-black text-white p-4 text-center">
          <div className="max-w-6xl mx-auto">
            <p>© 2025 BTC Mining. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
