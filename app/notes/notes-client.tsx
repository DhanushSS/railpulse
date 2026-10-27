'use client';
import { useEffect, useState, type FormEvent } from 'react';

type Train = {train_number:string;train_name:string};
type Note = {id:string;train_number:string;station_code?:string;category:string;note:string;tags:string[];source:string;created_at:string};
const labels: Record<string,string> = {DELAY_REVIEW:'Delay review',SERVICE:'Service',OTHER:'Other'};
export default function NotesClient({trains}:{trains:Train[]}) {
  const [notes,setNotes] = useState<Note[]>([]);
  const [train,setTrain] = useState(trains[0]?.train_number ?? '');
  const [station,setStation] = useState('');
  const [category,setCategory] = useState('DELAY_REVIEW');
  const [note,setNote] = useState('');
  const [tags,setTags] = useState('');
  const [filterTrain,setFilterTrain] = useState('');
  const [filterCategory,setFilterCategory] = useState('');
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState('');
  async function loadNotes() {
    setLoading(true);
    const query = new URLSearchParams();
    if (filterTrain) query.set('train',filterTrain);
    if (filterCategory) query.set('category',filterCategory);
    try {
      const response = await fetch(`/api/notes?${query}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load notes');
      setNotes(result.notes);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load notes'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadNotes(); }, [filterTrain,filterCategory]);
  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage('');
    const parsedTags = tags.split(',').map(tag=>tag.trim().toLowerCase()).filter(Boolean);
    try {
      const response = await fetch('/api/notes', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({train_number:train,station_code:station,category,note,tags:parsedTags})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save note');
      setNote(''); setTags(''); setStation(''); setMessage('Note saved.');
      await loadNotes();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save note'); }
    finally { setSaving(false); }
  }
  return <><section><h2>Add a service note</h2><form onSubmit={save} className="notes-form"><label>Train<select value={train} onChange={e=>setTrain(e.target.value)} required>{trains.map(t=><option key={t.train_number} value={t.train_number}>{t.train_number} — {t.train_name}</option>)}</select></label><label>Category<select value={category} onChange={e=>setCategory(e.target.value)}><option value="DELAY_REVIEW">Delay review</option><option value="SERVICE">Service</option><option value="OTHER">Other</option></select></label><label>Station code (optional)<input value={station} onChange={e=>setStation(e.target.value)} maxLength={10} placeholder="e.g. NDLS"/></label><label>Tags (optional, comma separated)<input value={tags} onChange={e=>setTags(e.target.value)} placeholder="review, timetable"/></label><label className="full">Observation<textarea value={note} onChange={e=>setNote(e.target.value)} minLength={10} maxLength={1000} required placeholder="Describe what you observed or want the team to review."/></label><button type="submit" disabled={saving}>{saving?'Saving…':'Save note'}</button><p role="status" className="status">{message}</p></form></section><section><div className="section-heading"><h2>Browse notes</h2><div className="filters"><label>Train<select value={filterTrain} onChange={e=>setFilterTrain(e.target.value)}><option value="">All trains</option>{trains.map(t=><option key={t.train_number} value={t.train_number}>{t.train_number}</option>)}</select></label><label>Category<select value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}><option value="">All categories</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div></div>{loading?<p>Loading notes…</p>:notes.length===0?<p>No notes match these filters.</p>:<div className="note-list">{notes.map(item=><article className="note-card" key={item.id}><div className="note-meta"><strong>{item.train_number}</strong><span>{labels[item.category]}</span>{item.station_code&&<span>{item.station_code}</span>}<span>{item.source==='illustrative_seed'?'Illustrative seed':'User entry'}</span></div><p>{item.note}</p><div className="tags">{item.tags.map(tag=><small key={tag}>{tag}</small>)}</div></article>)}</div>}</section></>;
}
