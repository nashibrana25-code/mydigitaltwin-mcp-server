import Resume from '@/components/Resume';
import ChatWidget from '@/components/ChatWidget';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <Resume />
      <ChatWidget />
    </main>
  );
}
