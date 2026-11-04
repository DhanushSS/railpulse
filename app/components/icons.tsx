export default function Icon({name,size=20}:{name:string;size?:number}) {
 const paths:Record<string,React.ReactNode>={
 reports:<><path d="M4 20h16M7 16v-5m5 5V4m5 12V8"/></>,
 incidents:<><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M10 7v3m0 3h.01"/></>,
 feedback:<><path d="M4 4h16v12H9l-5 4V4Z"/><path d="M8 8h8M8 12h5"/></>,
 overview:<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
 trains:<><rect x="5" y="3" width="14" height="15" rx="4"/><path d="M5 10h14M12 3v7M8 21l2-3m6 3-2-3"/><path d="M8 14h1m6 0h1"/></>,
 stations:<><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
 alerts:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
 notes:<><path d="M14 3H5v18h14V8l-5-5ZM14 3v6h5M8 13h8m-8 4h6"/></>,
 data:<><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 4 16 4 16 0V5M4 12v7c0 4 16 4 16 0v-7"/></>,
 search:<><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>,
 arrow:<path d="M4 12h16m-6-6 6 6-6 6"/>,
 download:<><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
 refresh:<><path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/></>,
 clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
 check:<path d="m5 12 4 4L19 6"/>,
 close:<path d="m6 6 12 12M6 18 18 6"/>,
 chevron:<path d="m9 5 7 7-7 7"/>,
 plus:<path d="M12 5v14M5 12h14"/>,
 edit:<><path d="m15 4 5 5-11 11H4v-5L15 4ZM13 6l5 5"/></>,
 trash:<><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/></>,
 menu:<path d="M3 6h18M3 12h18M3 18h18"/>
 };return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name==='database'?'data':name]||paths.overview}</svg>;
}
