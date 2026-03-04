import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AppShell } from "@/components/layout/AppShell"
import { ThemeProvider } from "@/components/layout/ThemeProvider"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: { template: "%s | FitTrack", default: "FitTrack" },
  description: "Self-hosted workout and nutrition tracker",
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico" },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f0f10",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('fittrack-theme')||'dark-purple';document.documentElement.setAttribute('data-theme',t);if(t.startsWith('light')){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}if(t==='custom'){var base=localStorage.getItem('fittrack-custom-base')||'dark';var accent=localStorage.getItem('fittrack-custom-accent')||'263 70% 76%';if(base==='light'){document.documentElement.setAttribute('data-custom-base','light');document.documentElement.classList.remove('dark')}document.documentElement.style.setProperty('--primary',accent);document.documentElement.style.setProperty('--ring',accent)}}catch(e){}`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
