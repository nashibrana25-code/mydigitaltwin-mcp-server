import Resume from '@/components/Resume';
import ChatWidget from '@/components/ChatWidget';

export default function Home() {
  return (
    <main className="min-h-screen bg-black py-8 px-4">
      <Resume />
      <ChatWidget />
    </main>
  );
}
