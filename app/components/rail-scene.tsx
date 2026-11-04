import {useId} from 'react';

/** Decorative railway illustration; not a geographical map or live status. */
export default function RailScene(){
 const id=useId().replaceAll(':','');
 return <svg className="rail-scene" viewBox="0 0 720 360" fill="none" aria-hidden="true">
  <defs>
   <linearGradient id={`${id}body`} x1="310" y1="90" x2="490" y2="300" gradientUnits="userSpaceOnUse"><stop stopColor="#e4f1f3"/><stop offset=".5" stopColor="#7c99b3"/><stop offset="1" stopColor="#263d56"/></linearGradient>
   <linearGradient id={`${id}side`} x1="340" y1="120" x2="650" y2="110" gradientUnits="userSpaceOnUse"><stop stopColor="#607c99"/><stop offset="1" stopColor="#142b44"/></linearGradient>
   <linearGradient id={`${id}glass`} x1="290" y1="125" x2="430" y2="205" gradientUnits="userSpaceOnUse"><stop stopColor="#071b2c"/><stop offset=".65" stopColor="#173a4d"/><stop offset="1" stopColor="#65c9bc"/></linearGradient>
   <radialGradient id={`${id}glow`}><stop stopColor="#4ee2bd" stopOpacity=".17"/><stop offset="1" stopColor="#4ee2bd" stopOpacity="0"/></radialGradient>
  </defs>
  <ellipse cx="410" cy="232" rx="300" ry="140" fill={`url(#${id}glow)`}/>
  <g stroke="#3a627b" strokeOpacity=".35"><path d="M0 300 720 60M0 340 720 100M70 360 720 143M200 360 720 187"/>{[80,150,220,290,360,430,500,570,640,710].map(x=><path key={x} d={`M${x} 360 ${x-220} 0`}/>)}</g>
  <g stroke="#496c85" strokeWidth="3"><path d="m110 357 585-242M205 360 507-211"/></g>
  <g stroke="#98b6c2" strokeOpacity=".6" strokeWidth="3">{[0,1,2,3,4,5,6].map(i=><path key={i} d={`m${130+i*69} ${350-i*28} 91 3`}/>)}</g>
  <path d="m296 252 333-136 72 20-333 149Z" fill="#060e19"/>
  <path d="m362 85 283-28q24-2 39 20l23 35-311 145-58-101Z" fill={`url(#${id}side)`} stroke="#7894a9" strokeOpacity=".6"/>
  <path d="m374 92 274-26 23 15-283 39Z" fill="#91a9bc" fillOpacity=".6"/>
  <path d="m404 125 280-42 14 22-291 80Z" fill="#0b2133"/>
  {[0,1,2,3,4,5,6,7].map(i=><path key={i} d={`m${427+i*34} ${126-i*5} 0 ${43-i*3}`} stroke="#829bad" strokeWidth="4"/>)}
  <path d="m401 207 301-92-3 12-301 110Z" fill="#3fe0b4"/>
  <path d="m333 88q32-8 48 18l39 70q16 35-9 62l-42 33q-14 10-33 2l-60-26q-25-12-19-39l24-81q8-26 52-39Z" fill={`url(#${id}body)`} stroke="#b1c7d3"/>
  <path d="m299 129 53-16q16-3 24 12l20 41q5 12-8 20l-84 29q-21 3-17-16l7-54q1-11 5-16Z" fill={`url(#${id}glass)`} stroke="#092438" strokeWidth="4"/>
  <path d="m348 117 19 76M296 145l76-23" stroke="#a9d6df" strokeOpacity=".35" strokeWidth="2"/>
  <path d="m265 220 79 28 66-40" stroke="#3fe0b4" strokeWidth="10"/>
  <path d="m290 249 49 17 38-22" stroke="#10283f" strokeWidth="9" strokeLinecap="round"/>
  <path d="m278 229 19 6m77-8 19-11" stroke="#ecfff7" strokeWidth="5" strokeLinecap="round"/>
  <path d="m336 100 17-4" stroke="#f5ba65" strokeWidth="4" strokeLinecap="round"/>
  <g stroke="#55c6b1" strokeWidth="1" strokeOpacity=".65"><path d="M95 150h104l40 40"/><circle cx="95" cy="150" r="4" fill="#69e5c0"/><path d="M456 267h111l28-28"/><circle cx="595" cy="239" r="4" fill="#69e5c0"/></g>
  <g fill="#8eafbf" fontFamily="monospace" fontSize="10" letterSpacing="2"><text x="95" y="137">RAILPULSE / 01</text><text x="461" y="287">JOURNEY INTELLIGENCE</text></g>
 </svg>;
}
