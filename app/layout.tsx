export const metadata = { title: "Vasukii Marketing Poster" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: "#0b1220", color: "#e2e8f0", margin: 0 }}>{children}</body>
    </html>
  );
}
