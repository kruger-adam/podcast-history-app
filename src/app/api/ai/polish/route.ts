import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text, field } = await request.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const fieldContext =
    field === "reason"
      ? "a note about why someone listened to a podcast episode"
      : "a note about key takeaways from a podcast episode";

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Polish this ${fieldContext}. Keep the same meaning and voice, but make it clearer, more concise, and better written. Return only the polished text with no preamble or explanation.\n\n${text}`,
      },
    ],
  });

  const block = message.content[0];
  const polished = block.type === "text" ? block.text : text;
  return NextResponse.json({ polished });
}
