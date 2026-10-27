import { currentUser } from '../lib/auth';
import { redirect } from 'next/navigation';
import Dashboard from './components/dashboard';
export default async function Home(){const user=await currentUser();if(!user)redirect("/login");return <Dashboard user={user}/>;}
