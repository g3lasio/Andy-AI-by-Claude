import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <nav className="fixed top-0 left-0 right-0 bg-white shadow p-4 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <div className="flex gap-4">
                <a href="/" className="hover:underline text-gray-900">Home</a>
                <a href="/chat" className="hover:underline text-gray-900">Chat</a>
              </div>
              <div className="hidden sm:flex gap-4">
                <a href="/documents" className="hover:underline text-gray-900">Documents</a>
                <a href="/tax" className="hover:underline text-gray-900">Tax Advisor</a>
              </div>
            </div>
          </div>
        </nav>
        <main className="pt-16 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}