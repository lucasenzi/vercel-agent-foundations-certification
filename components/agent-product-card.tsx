"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type PointerEvent } from "react";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { cn } from "@/lib/utils";
import type { ProductDetailsToolInvocation } from "@/lib/agent";

interface AgentProductCardProps {
  invocation: ProductDetailsToolInvocation;
}

type DetailsOutput = Extract<
  NonNullable<
    Extract<ProductDetailsToolInvocation, { state: "output-available" }>["output"]
  >,
  { stock: unknown }
>;

export function AgentProductCard({ invocation }: AgentProductCardProps) {
  if (
    invocation.state === "input-streaming" ||
    invocation.state === "input-available"
  ) {
    return <LoadingCard id={invocation.input?.idOrSlug} />;
  }

  if (invocation.state !== "output-available") return null;

  const output = invocation.output;
  if (!output) return null;

  if ("error" in output || !output.product) {
    return (
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: [0, -10, 10, -6, 6, 0] }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
      >
        {"error" in output ? output.error : "Product not found."}
      </motion.div>
    );
  }

  return <ProductShowcase data={output as DetailsOutput} />;
}

/* ------------------------------------------------------------------ */
/* Loading: scanning beam over a skeleton                              */
/* ------------------------------------------------------------------ */

function LoadingCard({ id }: { id?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4">
      <motion.div
        className="pointer-events-none absolute inset-y-0 w-1/3 bg-linear-to-r from-transparent via-fuchsia-500/20 to-transparent"
        animate={{ x: ["-100%", "400%"] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="aspect-4/3 rounded-xl bg-secondary" />
      <div className="mt-3 h-4 w-2/3 rounded bg-secondary" />
      <div className="mt-2 h-3 w-1/3 rounded bg-secondary" />
      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="size-3.5 animate-spin" />
        Summoning{id ? ` "${id}"` : " product"}…
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Showcase                                                            */
/* ------------------------------------------------------------------ */

const CONFETTI_COLORS = ["#f0abfc", "#a78bfa", "#38bdf8", "#34d399", "#facc15", "#fb7185"];

function ProductShowcase({ data }: { data: DetailsOutput }) {
  const { product, stock, relatedProducts } = data;
  const { addToCart, openCart } = useCart();
  const reduceMotion = useReducedMotion();

  const [imageIndex, setImageIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [qty, setQty] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [bursts, setBursts] = useState<number[]>([]);
  const [added, setAdded] = useState(false);

  const images = product.images.length > 0 ? product.images : [];
  const inStock = stock?.inStock ?? true;
  const maxQty = Math.max(1, Math.min(stock?.quantity ?? 10, 10));

  /* 3D tilt + holographic glare that follows the pointer */
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const springCfg = { stiffness: 180, damping: 18 };
  const rotateX = useSpring(useTransform(py, [0, 1], [7, -7]), springCfg);
  const rotateY = useSpring(useTransform(px, [0, 1], [-8, 8]), springCfg);
  const glareX = useTransform(px, (v) => `${v * 100}%`);
  const glareY = useTransform(py, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.35), transparent 45%)`;
  const holo = useMotionTemplate`linear-gradient(115deg, transparent 20%, rgba(240,171,252,0.25) ${glareX}, rgba(56,189,248,0.25), transparent 80%)`;

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    // Freeze the tilt while over a control so it doesn't slide out from
    // under the cursor and swallow the click.
    if ((e.target as Element).closest("button, a")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };
  const resetTilt = () => {
    px.set(0.5);
    py.set(0.5);
  };

  const go = (delta: number) => {
    if (images.length < 2) return;
    setDirection(delta);
    setImageIndex((i) => (i + delta + images.length) % images.length);
  };

  const handleAdd = () => {
    if (!inStock) return;
    addToCart({ ...product, createdAt: "" }, qty);
    setBursts((b) => [...b, Date.now()]);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div style={{ perspective: 1200 }} className="py-1">
      <motion.div
        onPointerMove={handlePointerMove}
        onPointerLeave={resetTilt}
        style={reduceMotion ? undefined : { rotateX, rotateY }}
        initial={{ opacity: 0, y: 24, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 20 }}
        className="group relative rounded-2xl p-[2px]"
      >
        {/* Spinning conic-gradient border */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <motion.div
            className="absolute -inset-1/2"
            style={{
              background:
                "conic-gradient(from 0deg, #c953de, #a78bfa, #38bdf8, #34d399, #facc15, #fb7185, #f0abfc)",
            }}
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
        </div>
        {/* Outer glow */}
        <div className="pointer-events-none absolute -inset-2 -z-10 rounded-3xl bg-linear-to-r from-fuchsia-500/40 via-sky-500/40 to-emerald-500/40 opacity-60 blur-xl transition-opacity group-hover:opacity-100" />

        <div className="relative z-10 overflow-hidden rounded-[14px] bg-card">
          {/* Dotted pattern backdrop */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(currentColor 1px, transparent 1px)",
              backgroundSize: "12px 12px",
            }}
          />

          {/* Gallery */}
          {images.length > 0 && (
            <div className="relative aspect-4/3 overflow-hidden bg-secondary">
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                  key={imageIndex}
                  custom={direction}
                  variants={{
                    enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0, scale: 1.1 }),
                    center: { x: 0, opacity: 1, scale: 1 },
                    exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0, scale: 0.9 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 260, damping: 28 }}
                  drag={images.length > 1 ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.6}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -60) go(1);
                    else if (info.offset.x > 60) go(-1);
                  }}
                  className="absolute inset-0 cursor-grab active:cursor-grabbing"
                >
                  <Image
                    src={images[imageIndex]}
                    alt={product.name}
                    fill
                    draggable={false}
                    sizes="(min-width: 768px) 480px, 100vw"
                    className="pointer-events-none object-cover"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Holographic sheen + glare */}
              <motion.div
                className="pointer-events-none absolute inset-0 mix-blend-overlay"
                style={{ background: holo }}
              />
              <motion.div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: glare }}
              />

              {product.featured && (
                <motion.span
                  initial={{ rotate: -12, scale: 0 }}
                  animate={{ rotate: -6, scale: 1 }}
                  transition={{ type: "spring", delay: 0.3 }}
                  className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-linear-to-r from-fuchsia-500 to-amber-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg"
                >
                  ★ Featured
                </motion.span>
              )}

              {images.length > 1 && (
                <>
                  <GalleryArrow side="left" onClick={() => go(-1)} />
                  <GalleryArrow side="right" onClick={() => go(1)} />
                  <div className="absolute inset-x-0 bottom-2 z-10 flex justify-center gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Show image ${i + 1}`}
                        onClick={() => {
                          setDirection(i > imageIndex ? 1 : -1);
                          setImageIndex(i);
                        }}
                        className="relative h-1.5 w-5 overflow-hidden rounded-full bg-white/40"
                      >
                        {i === imageIndex && (
                          <motion.span
                            layoutId={`dot-${product.id}`}
                            className="absolute inset-0 rounded-full bg-white"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="relative space-y-4 p-4">
            {/* Title + price */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {product.category}
                </p>
                <h3 className="text-lg font-bold leading-tight">{product.name}</h3>
              </div>
              <motion.p
                key={qty}
                initial={{ scale: 1.25, rotate: -4 }}
                animate={{ scale: 1, rotate: 0 }}
                className="shrink-0 bg-linear-to-r from-fuchsia-500 via-violet-500 to-sky-500 bg-clip-text text-xl font-black text-transparent"
              >
                {product.priceFormatted}
              </motion.p>
            </div>

            {stock && <StockMeter {...stock} />}

            {/* Expandable description */}
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="block w-full text-left"
            >
              <motion.p
                layout
                className={cn(
                  "text-sm text-muted-foreground",
                  !expanded && "line-clamp-2",
                )}
              >
                {product.description}
              </motion.p>
              <span className="mt-1 inline-block text-xs font-medium text-violet-500">
                {expanded ? "Show less ↑" : "Read more ↓"}
              </span>
            </button>

            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {product.tags.slice(0, 6).map((tag, i) => (
                  <motion.span
                    key={tag}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    whileHover={{ scale: 1.12, rotate: i % 2 ? 3 : -3 }}
                    className="cursor-default rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-600 dark:text-violet-300"
                  >
                    #{tag}
                  </motion.span>
                ))}
              </div>
            )}

            {/* Qty + add to cart */}
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-full border border-border bg-background">
                <StepButton
                  label="Decrease quantity"
                  disabled={qty <= 1 || !inStock}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  <Minus className="size-3.5" />
                </StepButton>
                <div className="relative w-7 overflow-hidden text-center text-sm font-semibold tabular-nums">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={qty}
                      initial={{ y: -16, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 16, opacity: 0 }}
                      className="block"
                    >
                      {qty}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <StepButton
                  label="Increase quantity"
                  disabled={qty >= maxQty || !inStock}
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                >
                  <Plus className="size-3.5" />
                </StepButton>
              </div>

              <div className="relative flex-1">
                <motion.button
                  type="button"
                  onClick={handleAdd}
                  disabled={!inStock}
                  whileHover={inStock ? { scale: 1.03 } : undefined}
                  whileTap={inStock ? { scale: 0.94 } : undefined}
                  className={cn(
                    "relative flex h-10 w-full items-center justify-center gap-2 overflow-hidden rounded-full text-sm font-bold text-white shadow-lg transition-colors",
                    inStock
                      ? "bg-linear-to-r from-fuchsia-500 via-violet-500 to-sky-500 shadow-violet-500/30"
                      : "cursor-not-allowed bg-muted text-muted-foreground shadow-none",
                  )}
                >
                  {inStock && (
                    <motion.span
                      className="pointer-events-none absolute inset-y-0 w-1/4 -skew-x-12 bg-white/30"
                      animate={{ x: ["-200%", "500%"] }}
                      transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1 }}
                    />
                  )}
                  <AnimatePresence mode="wait" initial={false}>
                    {added ? (
                      <motion.span
                        key="added"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <Check className="size-4" /> Added {qty}!
                      </motion.span>
                    ) : (
                      <motion.span
                        key="add"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <ShoppingBag className="size-4" />
                        {inStock ? "Add to cart" : "Sold out"}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>

                {/* Confetti bursts */}
                {bursts.map((id) => (
                  <ConfettiBurst
                    key={id}
                    onDone={() => setBursts((b) => b.filter((x) => x !== id))}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <Link
                href={`/products/${product.slug}`}
                className="group/link inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
              >
                Full product page
                <motion.span className="inline-block transition-transform group-hover/link:translate-x-1">
                  →
                </motion.span>
              </Link>
              <button
                type="button"
                onClick={openCart}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Open cart
              </button>
            </div>

            {/* Related products carousel */}
            {relatedProducts.length > 0 && (
              <div className="border-t border-border pt-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  You might also like
                </p>
                <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
                  {relatedProducts.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.07 }}
                      whileHover={{ y: -4 }}
                      className="snap-start"
                    >
                      <Link
                        href={`/products/${p.slug}`}
                        className="block w-36 rounded-xl border border-border bg-background/70 p-2.5 backdrop-blur transition-colors hover:border-violet-500/50"
                      >
                        <span className="line-clamp-2 text-xs font-medium leading-snug">
                          {p.name}
                        </span>
                        <span className="mt-1 block text-xs font-bold text-violet-500">
                          {p.priceFormatted}
                        </span>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function GalleryArrow({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <motion.button
      type="button"
      aria-label={side === "left" ? "Previous image" : "Next image"}
      onClick={onClick}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      className={cn(
        "absolute top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100",
        side === "left" ? "left-2" : "right-2",
      )}
    >
      <Icon className="size-4" />
    </motion.button>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      whileTap={{ scale: 0.8, rotate: -15 }}
      className="flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary disabled:opacity-30"
    >
      {children}
    </motion.button>
  );
}

function StockMeter({
  inStock,
  lowStock,
  quantity,
}: {
  inStock: boolean;
  lowStock: boolean;
  quantity: number;
}) {
  const pct = inStock ? Math.max(8, Math.min(100, (quantity / 50) * 100)) : 0;
  const tone = !inStock
    ? { dot: "bg-destructive", bar: "bg-destructive", text: "text-destructive" }
    : lowStock
      ? { dot: "bg-amber-500", bar: "bg-linear-to-r from-rose-500 to-amber-400", text: "text-amber-600" }
      : { dot: "bg-emerald-500", bar: "bg-linear-to-r from-emerald-400 to-sky-400", text: "text-emerald-600" };
  const label = !inStock
    ? "Out of stock"
    : lowStock
      ? `Hurry — only ${quantity} left!`
      : `In stock · ${quantity} available`;

  return (
    <div className="space-y-1.5">
      <div className={cn("flex items-center gap-2 text-xs font-semibold", tone.text)}>
        <span className="relative flex size-2">
          {inStock && (
            <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-75", tone.dot)} />
          )}
          <span className={cn("relative inline-flex size-2 rounded-full", tone.dot)} />
        </span>
        {label}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <motion.div
          className={cn("h-full rounded-full", tone.bar)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
      </div>
    </div>
  );
}

function ConfettiBurst({ onDone }: { onDone: () => void }) {
  const [pieces] = useState(() =>
    Array.from({ length: 28 }, (_, i) => {
      const angle = (i / 28) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 60 + Math.random() * 70;
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 30,
        rotate: Math.random() * 720 - 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 5 + Math.random() * 5,
        round: Math.random() > 0.5,
      };
    }),
  );

  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-20">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute block"
          style={{
            width: p.size,
            height: p.round ? p.size : p.size * 0.4,
            background: p.color,
            borderRadius: p.round ? 9999 : 1,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
          animate={{
            x: p.x,
            y: [0, p.y, p.y + 40],
            opacity: [1, 1, 0],
            scale: [0, 1.2, 0.8],
            rotate: p.rotate,
          }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          onAnimationComplete={i === 0 ? onDone : undefined}
        />
      ))}
    </div>
  );
}
