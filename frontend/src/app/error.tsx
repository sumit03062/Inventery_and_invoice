'use client';
export default function ErrorPage({reset}:{error:Error;reset:()=>void}){return <div className="empty"><h1>Unable to open this page</h1><p>Please try again. Your saved records are kept on the server.</p><button className="btn primary" onClick={reset}>Try again</button></div>;}
