import './style.css';
export const metadata = { title: 'RailPulse — Railway Intelligence', description: 'Explore historical railway journeys, delays, station performance and service notes.' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
