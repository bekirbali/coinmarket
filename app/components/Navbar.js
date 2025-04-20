"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      <nav className="max-w-6xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          BTC Mining
        </Link>

        {/* Mobile Menu Button (hamburger menu) */}
        <button
          className="md:hidden flex flex-col justify-center items-center"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span
            className={`block w-6 h-0.5 bg-white mb-1.5 transition-transform ${
              isMenuOpen ? "rotate-45 translate-y-2" : ""
            }`}
          ></span>
          <span
            className={`block w-6 h-0.5 bg-white mb-1.5 transition-opacity ${
              isMenuOpen ? "opacity-0" : ""
            }`}
          ></span>
          <span
            className={`block w-6 h-0.5 bg-white transition-transform ${
              isMenuOpen ? "-rotate-45 -translate-y-2" : ""
            }`}
          ></span>
        </button>

        {/* Desktop Navigation */}
        <ul className="hidden md:flex gap-6">
          <li>
            <Link href="/" className="hover:text-yellow-400 transition-colors">
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

      {/* Mobile Navigation Menu */}
      <div
        className={`md:hidden ${
          isMenuOpen ? "block" : "hidden"
        } mt-4 w-1/2 ml-auto rounded-xl bg-black shadow-lg absolute right-4 top-16 z-50`}
      >
        <ul className="flex flex-col gap-4 p-4">
          <li>
            <Link
              href="/"
              className="hover:text-yellow-400 transition-colors block py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Ana Sayfa
            </Link>
          </li>
          <li>
            <Link
              href="/about"
              className="hover:text-yellow-400 transition-colors block py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Hakkımızda
            </Link>
          </li>
          <li>
            <Link
              href="/draw-money"
              className="hover:text-yellow-400 transition-colors block py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Para Çek
            </Link>
          </li>
        </ul>
      </div>
    </>
  );
}
