'use client';
export default function QueryDetails({query,label='query'}:{query:string;label?:string}) {
 return <details className="query-details"><summary><span className="query-show">Show {label}</span><span className="query-hide">Hide {label}</span><span className="query-hint">Database demonstration</span></summary><pre>{query}</pre></details>;
}
