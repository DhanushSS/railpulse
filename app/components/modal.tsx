'use client';
import {useEffect,useRef,type ReactNode} from 'react';
import Icon from './icons';
export function Modal({title,subtitle,onClose,children}:{title:string;subtitle?:string;onClose:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement;const old=document.body.style.overflow;document.body.style.overflow='hidden';ref.current?.querySelector<HTMLButtonElement>('button')?.focus();return()=>{document.body.style.overflow=old;previous?.focus();};},[]);
 return <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={ref} onKeyDown={e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const nodes=ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,textarea,a[href]');if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}}><div className="modal-heading"><div><span className="eyebrow">RAILPULSE / DETAILS</span><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button className="icon-button" aria-label="Close details" onClick={onClose}><Icon name="close"/></button></div>{children}</div></div>;
}
