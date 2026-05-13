import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SnehYoga Team CRM — Internal Productivity Platform",
  description: "Premium internal team productivity and CRM system for SnehYoga organization. Manage tasks, leads, team performance, and more.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
