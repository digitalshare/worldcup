import ChatBox from "../components/ChatBox.jsx";
import { useT } from "../lib/i18n.jsx";

export default function Chat() {
  const t = useT();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("chat.title")}</h1>
        <p className="text-sm text-slate-400">
          {t("chat.intro")}
        </p>
      </div>
      <ChatBox />
    </div>
  );
}
