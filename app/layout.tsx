import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Says So Agent",
  description: "Says So Agent — powered by the Sela Network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
