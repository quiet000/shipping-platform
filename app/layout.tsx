import type { Metadata } from "next";
import { Almarai } from "next/font/google";
import { Providers } from "@/components/providers";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const almarai = Almarai({
  weight: ["300", "400", "700", "800"],
  subsets: ["arabic", "latin"],
  variable: "--font-almarai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "منصة الشحن اللوجستي - تتبع الشحنات وإدارة العمليات",
  description:
    "منصة متكاملة لشركات الشحن والخدمات اللوجستية: تتبع شحناتك لحظة بلحظة وإدارة عمليات التوصيل.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={almarai.className}>
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
