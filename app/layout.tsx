import './style.css';
export const metadata = { title: 'RailPulse', description: 'Illustrative railway reliability dashboard' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
