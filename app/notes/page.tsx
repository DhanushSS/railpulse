import { currentUser } from '../../lib/auth';
import { redirect } from 'next/navigation';
import Dashboard from '../components/dashboard';
export default async function NotesPage(){const user=await currentUser();if(!user)redirect("/login");return <Dashboard initialTab="notes" user={user}/>;}
