'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="loading-state"><h1>RailPulse needs a connection.</h1><p>The workspace could not load. Check your local database services and try again.</p><button className="button primary" style={{marginTop:24}} onClick={reset}>Try again</button></main>;}
