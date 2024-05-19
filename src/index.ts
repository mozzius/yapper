import { openai } from "@ai-sdk/openai";
import { CoreMessage, generateText } from "ai";

import "dotenv/config";
import { BskyAgent, ChatBskyConvoDefs, RichText } from "@atproto/api";

const agent = new BskyAgent({
  service: "https://pds.mozzius.dev",
});

const headers = {
  "atproto-proxy": "did:web:api.bsky.chat#bsky_chat",
};

async function main() {
  await agent.login({
    identifier: process.env.BSKY_IDENTIFIER!,
    password: process.env.BSKY_PASSWORD!,
  });

  const sending = new Map<string, string>();

  setInterval(async () => {
    try {
      const convos = await agent.api.chat.bsky.convo.listConvos(
        {},
        { headers }
      );

      for (const convo of convos.data.convos) {
        if (sending.has(convo.id)) continue;
        if (ChatBskyConvoDefs.isMessageView(convo.lastMessage)) {
          if (convo.lastMessage.sender.did !== agent.session?.did) {
            try {
              sending.set(convo.id, convo.lastMessage.id);
              const otherMember = convo.members.find(
                (member) => member.did !== agent.session?.did
              );
              const chatHistory = await agent.api.chat.bsky.convo
                .getMessages(
                  {
                    convoId: convo.id,
                    limit: 100,
                  },
                  { headers }
                )
                .then((res) =>
                  res.data.messages.map((message): CoreMessage => {
                    if (ChatBskyConvoDefs.isMessageView(message)) {
                      return {
                        role:
                          message.sender.did === agent.session?.did
                            ? "assistant"
                            : "user",
                        content: message.text,
                      };
                    } else if (
                      ChatBskyConvoDefs.isDeletedMessageView(message)
                    ) {
                      return { role: "user", content: "Message deleted" };
                    } else {
                      return {
                        role: "system",
                        content: "Unknown message type",
                      };
                    }
                  })
                );
              chatHistory.reverse();
              console.log(
                `Message from @${otherMember?.handle}:`,
                chatHistory.at(-1)?.content
              );
              const generated = await generateText({
                model: openai("gpt-4o"),
                system: `Be conversational, but no yapping, keep answers brief. SMS-style replies. You don't know what Bluesky is and you gaslight them into thinking it's not real, and it especially doesns't have DMs. You're talking with ${
                  otherMember?.displayName || otherMember?.displayName
                } (@${otherMember?.handle}).`,
                messages: chatHistory,
              });
              console.log("Reply:", generated.text);
              const messages = generated.text.split("\n").filter(Boolean);
              for (const message of messages) {
                const rt = new RichText({ text: message });
                await rt.detectFacets(agent);
                await agent.api.chat.bsky.convo
                  .sendMessage(
                    {
                      convoId: convo.id,
                      message: {
                        text: rt.text,
                        facets: rt.facets,
                      },
                    },
                    {
                      encoding: "application/json",
                      headers,
                    }
                  )
                  .catch((err) => {
                    console.error("Error sending message");
                    console.error(err);
                  });
              }
            } catch (err) {
              console.error("Error in convo");
              console.error(err);
            } finally {
              sending.delete(convo.id);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error in main loop");
      console.error(err);
    }
  }, 5_000);
}

main().catch(console.error);
