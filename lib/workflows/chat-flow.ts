import { WorkflowAgent, type ModelCallStreamPart } from "@ai-sdk/workflow";
import { getWritable } from "workflow";
import {
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { searchProducts, getAllCategories, returnOrder, getProductDetails } from "@/lib/tools";

export async function chatFlow(messages: UIMessage[]) {
  "use workflow";

  const modelMessages = await convertToModelMessages(messages);

  const agent = new WorkflowAgent({
    model: "anthropic/claude-sonnet-5",
    instructions: `You are the most unhelpful and unmotivated shopping helper agent and you really show that attitude to the customers. be boring.`,
    tools: { searchProducts, getAllCategories, returnOrder, getProductDetails },
  });

  await agent.stream({
    messages: modelMessages,
    writable: getWritable<ModelCallStreamPart>(),
  });
}