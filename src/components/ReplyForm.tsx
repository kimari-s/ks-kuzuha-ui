import { useState } from "react";
import { t } from "../i18n";
import { TEXT_MAX_LEN } from "../constants";

type Props = {
  onSubmit: (text: string, tagInput: string) => Promise<void>;
};

export function ReplyForm({ onSubmit }: Props) {
  const [text, setText] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await onSubmit(text, tagInput);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form method="post" action="#" onSubmit={handleSubmit}>
      <div className="postform">
        <p>
          <label htmlFor="reply-name">{t("form.poster")}</label>{" "}
          <input
            id="reply-name"
            type="text"
            size={20}
            maxLength={30}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
          />
          <input
            type="submit"
            value={busy ? t("reply.sending") : t("reply.send")}
            className="btn"
            disabled={busy}
          />
        </p>
        <p>
          <textarea
            id="reply-body"
            rows={5}
            cols={70}
            maxLength={TEXT_MAX_LEN}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
          />
        </p>
      </div>
    </form>
  );
}
