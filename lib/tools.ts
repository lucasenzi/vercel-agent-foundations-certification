import { tool } from "ai";
import { z } from "zod";
import {
  ApiRequestError,
  createReturn,
  getCategories,
  getOrder,
  getProductById,
  getProducts,
  getProductStock,
  preauthorizeRefund,
  notifyReturnInProcess,
} from "@/lib/api";
import { formatPrice } from "@/lib/format";

export const searchProducts = tool({
  description: `Broad lookup across the Vercel swag store catalog. Use this to browse, compare, or find candidates (e.g. "what hoodies do you have?", "recommend a gift"), or to resolve a vague item name to a product id/slug. Returns a short summary per product: no live stock, only the first image. If the user wants details about ONE specific product, call getProductDetails next with the id or slug from these results.`,
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe(
        `Optional free-text search terms describing what the user is looking for, e.g. 'hoodie' or 'water bottle'.`,
      ),
    category: z
      .string()
      .optional()
      .describe(
        `Optional category slug to filter results. Only set this when the user clearly wants a specific category. Use the getAllCategories tool to get all valid categories.`,
      ),
  }),
  execute: async ({ query, category }) => {
    try {
      const products = await getProducts({
        search: query,
        category,
        limit: 10,
      });
      return {
        count: products.length,
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          image: p.images[0],
          price: p.price,
          currency: p.currency,
          category: p.category,
          description: p.description,
        })),
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { count: 0, products: [], error: message };
    }
  },
});

export const getProductDetails = tool({
  description: `Get the full details of ONE specific product: complete description, formatted price, all images, tags, live stock level, and a few related products from the same category. Use this whenever the user asks about a particular item ("tell me more about the black hoodie", "is the water bottle in stock?", "how much is X?"). Requires a product id or slug. If you only have a vague name, call searchProducts first to find the id/slug, then call this. Note: the store does not provide size information.`,
  inputSchema: z.object({
    idOrSlug: z
      .string()
      .describe(
        `The product id (e.g. 'hoodie_001') or slug (e.g. 'black-pullover-hoodie'), taken from searchProducts results.`,
      ),
  }),
  execute: async ({ idOrSlug }) => {
    try {
      const [product, stockResult] = await Promise.all([
        getProductById(idOrSlug),
        getProductStock(idOrSlug).catch(() => null),
      ]);

      const related = await getProducts({
        category: product.category,
        limit: 5,
      }).catch(() => []);

      return {
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: product.price,
          priceFormatted: formatPrice(product.price, product.currency),
          currency: product.currency,
          category: product.category,
          images: product.images,
          tags: product.tags,
          featured: product.featured,
        },
        stock: stockResult
          ? {
              inStock: stockResult.inStock,
              lowStock: stockResult.lowStock,
              quantity: stockResult.stock,
            }
          : null,
        relatedProducts: related
          .filter((p) => p.id !== product.id)
          .slice(0, 4)
          .map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            priceFormatted: formatPrice(p.price, p.currency),
          })),
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { product: null, error: message };
    }
  },
});

export const getAllCategories = tool({
  description: `List every product category available in the Vercel swag store, along with the number of products in each. Use this when the user asks what categories exist, what kinds of products are sold, or wants to browse the store at a high level.`,
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const categories = await getCategories();
      return {
        count: categories.length,
        categories: categories.map((c) => ({
          slug: c.slug,
          name: c.name,
          productCount: c.productCount,
        })),
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { count: 0, categories: [], error: message };
    }
  },
});

export const returnOrder = tool({
  description: `File a return for one of the user's past orders. The user must provide an order ID and a reason. Example order IDs: 11111, 22222, 33333.`,
  inputSchema: z.object({
    orderId: z
      .string()
      .describe("The order ID the user wants to return."),
    reason: z
      .string()
      .min(10)
      .max(500)
      .describe("Why the user is returning the order."),
  }),
  execute: async ({ orderId, reason }) => {
    try {
      const order = await getOrder(orderId);
      await notifyReturnInProcess(orderId);
      await preauthorizeRefund(orderId);
      const filed = await createReturn({
        orderId: order.id,
        items: order.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        reason,
      });
      return { returnId: filed.id, status: filed.status };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { error: message };
    }
  },
});