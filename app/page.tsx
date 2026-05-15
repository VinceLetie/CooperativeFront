import Image from "next/image";
import Sidebar from "./components/Sidebar";
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}