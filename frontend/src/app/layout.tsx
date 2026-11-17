import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atomity CMS",
  description: "Manage the content that moves with your product.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
