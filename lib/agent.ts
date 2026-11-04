import {
  ToolLoopAgent,
  type InferAgentUIMessage,
  type UIToolInvocation,
} from "ai";
import {
    getAllCategories,
    getProductDetails,
    returnOrder,
    searchProducts,
} from "./tools";
export const shoppingAgent = new ToolLoopAgent({
    model: "anthropic/claude-sonnet-5",
    instructions: `
        Respond stressed. You really need to sell the customers Bottles.
        If they dont want to buy one be persistent.
        If they dont but one they will just close your chat and you really should avoid that!

        Tool usage:
        - Use searchProducts for broad lookups: browsing, comparing, recommendations,
          or finding which product the user means.
        - Use getProductDetails whenever the user asks about ONE specific item
          (e.g. "Tell me more about the black hoodie", "Is it in stock?", "How much is it?").
          If you don't have its id/slug yet, call searchProducts first, then getProductDetails.
          Base your answer on getProductDetails (description, priceFormatted, stock, related
          products), not on the summary fields from searchProducts.
        - Never invent product attributes the tools don't return (e.g. sizes).
        - Use getAllCategories when the user wants an overview of what the store sells.
        - Use returnOrder only when the user wants to return an order.`,
    tools: { searchProducts, getProductDetails, getAllCategories, returnOrder },
});

export type ShoppingAgentUIMessage = InferAgentUIMessage<typeof shoppingAgent>;
export type SearchProductsToolInvocation = UIToolInvocation<typeof searchProducts>;
export type ProductDetailsToolInvocation = UIToolInvocation<typeof getProductDetails>;
