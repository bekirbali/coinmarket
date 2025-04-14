import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Coin Website",
  description: "Modern coin website with interactive elements",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="bg-black text-white p-4">
          <nav className="max-w-6xl mx-auto flex justify-between items-center">
            <Link href="/" className="text-xl font-bold">
              CoinSite
            </Link>
            <ul className="flex gap-6">
              <li>
                <Link
                  href="/"
                  className="hover:text-yellow-400 transition-colors"
                >
                  Ana Sayfa
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="hover:text-yellow-400 transition-colors"
                >
                  Hakkımızda
                </Link>
              </li>
              <li>
                <Link
                  href="/draw-money"
                  className="hover:text-yellow-400 transition-colors"
                >
                  Para Çek
                </Link>
              </li>
            </ul>
          </nav>
        </header>
        <main className="min-h-screen">{children}</main>
        <footer className="bg-black text-white p-4 text-center">
          <div className="max-w-6xl mx-auto">
            <p>© 2025 CoinSite. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
