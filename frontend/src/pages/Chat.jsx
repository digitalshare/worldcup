import ChatBox from "../components/ChatBox.jsx";

export default function Chat() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">AI Assistant</h1>
        <p className="text-sm text-slate-400">
          Powered by Butterbase RAG over a curated World Cup 2026 knowledge base — answers cite their sources.
        </p>
      </div>
      <ChatBox />
    </div>
  );
}
